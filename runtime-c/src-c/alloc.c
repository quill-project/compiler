
#include <quill.h>
#include <stddef.h>

#ifdef _WIN32
    static void *win_alloc(size_t size) {
        return VirtualAlloc(
            NULL, size,
            MEM_COMMIT | MEM_RESERVE,
            PAGE_READWRITE
        );
    }

    static void win_free(void* ptr, size_t size) {
        (void) size;
        VirtualFree(ptr, 0, MEM_RELEASE);
    }

    #define REGION_ALLOC(n) win_alloc(n)
    #define REGION_FREE(p, n) win_free(p, n)
#else
    #include <sys/mman.h>
    #include <unistd.h>

    static void *mmap_alloc(size_t size) {
        size_t pagesize = getpagesize();
        size_t aligned_size = (size + pagesize - 1) & ~(pagesize - 1);
        void *ptr = mmap(
            NULL, aligned_size,
            PROT_READ | PROT_WRITE,
            MAP_PRIVATE | MAP_ANONYMOUS,
            -1, 0
        );
        if(ptr == MAP_FAILED) { return NULL; }
        return ptr;
    }

    static void mmap_free(void* ptr, size_t size) {
        size_t pagesize = getpagesize();
        size_t aligned_size = (size + pagesize - 1) & ~(pagesize - 1);
        munmap(ptr, aligned_size);
    }

    #define REGION_ALLOC(n) mmap_alloc(n)
    #define REGION_FREE(p, n) mmap_free(p, n)
#endif


typedef struct quill_slab quill_slab_t;

#define NO_CLASS -1

typedef struct quill_slab {
    int64_t class_i;
    quill_slab_t *next; // for free lists
    uint8_t data[];
} quill_slab_t;

#define REGION_SLAB_COUNT 8192

typedef struct quill_region {
    size_t next_i;
    uint8_t data[];
} quill_region_t;

typedef struct quill_class {
    size_t slab_content_size;
    quill_region_t *next;
    quill_slab_t *unused_next;
} quill_class_t;

typedef struct quill_class_unused {
    _Atomic(uint64_t) count;
    quill_mutex_t lock;
    quill_slab_t *next;
} quill_class_unused_t;

#define CLASS_COUNT 6
#define MAX_SLAB_SIZE 256

static thread_local quill_class_t classes[CLASS_COUNT] = {
    (quill_class_t) {
        .slab_content_size = 8,
        .next = NULL, .unused_next = NULL
    },
    (quill_class_t) {
        .slab_content_size = 16,
        .next = NULL, .unused_next = NULL
    },
    (quill_class_t) {
        .slab_content_size = 32,
        .next = NULL, .unused_next = NULL
    },
    (quill_class_t) {
        .slab_content_size = 64,
        .next = NULL, .unused_next = NULL
    },
    (quill_class_t) {
        .slab_content_size = 128,
        .next = NULL, .unused_next = NULL
    },
    (quill_class_t) {
        .slab_content_size = MAX_SLAB_SIZE,
        .next = NULL, .unused_next = NULL
    }
};

static quill_class_unused_t global_unused[CLASS_COUNT];

void quill_alloc_init_global(void) {
    for(size_t class_i = 0; class_i < CLASS_COUNT; class_i += 1) {
        quill_class_unused_t *g_unused = &global_unused[class_i];
        atomic_store(&g_unused->count, 0);
        quill_mutex_init(&g_unused->lock);
        g_unused->next = NULL;
    }
}

void quill_alloc_init_thread(void) {
    // no setup needed
}

void quill_alloc_destruct_thread(void) {
    for(size_t class_i = 0; class_i < CLASS_COUNT; class_i += 1) {
        quill_class_t *c = &classes[class_i];
        quill_class_unused_t *g_unused = &global_unused[class_i];
        quill_mutex_lock(&g_unused->lock);
        size_t added_c = 0;
        for(;;) {
            quill_slab_t *transferred = c->unused_next;
            if(transferred == NULL) { break; }
            c->unused_next = transferred->next;
            transferred->next = g_unused->next;
            g_unused->next = transferred;
            added_c += 1;
        }
        size_t slab_size = sizeof(quill_slab_t) + c->slab_content_size;
        quill_region_t *region = c->next;
        if(region != NULL) {
            size_t slab_i = region->next_i;
            for(; slab_i < REGION_SLAB_COUNT; slab_i += 1) {
                quill_slab_t *added 
                    = (quill_slab_t *) (region->data + (slab_i * slab_size));
                added->next = g_unused->next;
                g_unused->next = added;
                added_c += 1;
            }
        }
        atomic_fetch_add(&g_unused->count, added_c);
        quill_mutex_unlock(&g_unused->lock);
    }
}

static const uint8_t size_class_of[MAX_SLAB_SIZE + 1] = {
    // 0
    0,
    // 1..8
    0, 0, 0, 0, 0, 0, 0, 0,
    // 9..16
    1, 1, 1, 1, 1, 1, 1, 1,
    // 17..32
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    // 33..64
    3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
    3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
    // 65..128
    4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
    4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
    4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
    4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
    // 129, 256
    5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5
};

#define G_UNUSED_BATCH_SIZE 16

static void fetch_global_unused(
    quill_class_t *c, quill_class_unused_t *g_unused
) {
    quill_mutex_lock(&g_unused->lock);
    size_t fetched_c = 0;
    for(; fetched_c < G_UNUSED_BATCH_SIZE; fetched_c += 1) {
        quill_slab_t *popped = g_unused->next;
        if(popped == NULL) { break; }
        g_unused->next = popped->next;
        popped->next = c->unused_next;
        c->unused_next = popped;
    }
    atomic_fetch_sub(&g_unused->count, fetched_c);
    quill_mutex_unlock(&g_unused->lock);
}

static quill_slab_t *allocate_slab(size_t class_i, quill_class_t *c) {
    size_t slab_size = sizeof(quill_slab_t) + c->slab_content_size;
    quill_region_t *region = c->next;
    if(region == NULL || region->next_i == REGION_SLAB_COUNT) {
        region = REGION_ALLOC(
            sizeof(quill_region_t) + (REGION_SLAB_COUNT * slab_size)
        );
        if(region == NULL) {
            quill_panic(quill_string_from_static_cstr(
                "Failed to allocate memory region"
            ));
        }
        region->next_i = 0;
        c->next = region;
    }
    size_t slab_i = region->next_i;
    quill_slab_t *slab = (quill_slab_t *) (region->data + (slab_i * slab_size));
    region->next_i = slab_i + 1;
    slab->class_i = class_i;
    return slab;
}

void *quill_alloc_alloc(size_t n) {
    if(n > MAX_SLAB_SIZE) {
        quill_slab_t *slab = malloc(sizeof(quill_slab_t) + n);
        slab->class_i = NO_CLASS;
        return slab->data;
    }
    size_t class_i = size_class_of[n];
    quill_class_t *c = &classes[class_i];
    quill_slab_t *next = c->unused_next;
    if(next != NULL) {
        c->unused_next = next->next;
        return next->data;
    }
    quill_class_unused_t *g_unused = &global_unused[class_i];
    if(atomic_load(&g_unused->count) >= G_UNUSED_BATCH_SIZE) {
        fetch_global_unused(c, g_unused);
        next = c->unused_next;
        if(next != NULL) {
            c->unused_next = next->next;
            return next->data;
        }
    }
    return allocate_slab(class_i, c)->data;
}

void quill_alloc_free(void *alloc) {
    quill_slab_t *slab = (quill_slab_t *) (
        ((uint8_t *) alloc) - offsetof(quill_slab_t, data)
    );
    size_t class_i = slab->class_i;
    if(class_i == NO_CLASS) {
        free(slab);
        return;
    }
    quill_class_t *c = &classes[class_i];
    slab->next = c->unused_next;
    c->unused_next = slab;
}