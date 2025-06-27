
#include <stdint.h>
#include <stdlib.h>
#include <stddef.h>

#ifdef _WIN32
    #define REGION_ALLOC(n) malloc(n)
    #define REGION_FREE(p, n) free(p)
#else
    #include <sys/mman.h>
    #include <unistd.h>

    static void* mmap_alloc(size_t size) {
        size_t pagesize = getpagesize();
        size_t aligned_size = (size + pagesize - 1) & ~(pagesize - 1);
        void* ptr = mmap(
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

typedef struct quill_region quill_region_t;

typedef struct quill_slab quill_slab_t;

typedef struct quill_slab_alloc {
    size_t slab_content_size;
    quill_slab_t *next_free;
    quill_region_t *first;
    quill_region_t *next;
} quill_slab_alloc_t;

#define REGION_SLAB_COUNT 16384

typedef struct quill_region {
    quill_region_t *next;
    size_t next_i;
    uint8_t data[];
} quill_region_t;

typedef struct quill_slab {
    quill_slab_alloc_t *owner;
    quill_slab_t *next_free;
    uint8_t data[];
} quill_slab_t;

quill_slab_alloc_t allocators[4] = {
    (quill_slab_alloc_t) {
        .slab_content_size = 8,
        .next_free = NULL,
        .first = NULL, .next = NULL
    },
    (quill_slab_alloc_t) {
        .slab_content_size = 16,
        .next_free = NULL,
        .first = NULL, .next = NULL
    },
    (quill_slab_alloc_t) {
        .slab_content_size = 32,
        .next_free = NULL,
        .first = NULL, .next = NULL
    },
    (quill_slab_alloc_t) {
        .slab_content_size = 64,
        .next_free = NULL,
        .first = NULL, .next = NULL
    }
};

#define MAX_SLAB_ALLOC_SIZE 64
size_t alloc_idx_of[MAX_SLAB_ALLOC_SIZE + 1] = {
    0,
    // 1..8 -> [0]
    0, 0, 0, 0, 0, 0, 0, 0,
    // 9..16 -> [1]
    1, 1, 1, 1, 1, 1, 1, 1,
    // 17..32 -> [2]
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    // 33..64 -> [3]
    3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 
    3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3
};

#define FALLBACK_ALLOC(n) malloc(n)
#define FALLBACK_FREE(p) free(p)

void *quill_buffer_alloc(size_t n) {
    if(n > MAX_SLAB_ALLOC_SIZE) {
        quill_slab_t *slab = FALLBACK_ALLOC(sizeof(quill_slab_t) + n);
        slab->owner = NULL;
        return slab->data;
    }
    size_t alloc_i = alloc_idx_of[n];
    quill_slab_alloc_t *alloc = &allocators[alloc_i];
    quill_slab_t *free_slab = alloc->next_free;
    if(free_slab != NULL) {
        alloc->next_free = free_slab->next_free;
        return free_slab->data;
    }
    size_t slab_size = sizeof(quill_slab_t) + alloc->slab_content_size;
    quill_region_t *region = alloc->next;
    if(region == NULL || region->next_i == REGION_SLAB_COUNT) {
        size_t region_content_size = slab_size * REGION_SLAB_COUNT;
        quill_region_t *new_region = REGION_ALLOC(
            sizeof(quill_region_t) + region_content_size
        );
        new_region->next = NULL;
        new_region->next_i = 0;
        if(region == NULL) {
            alloc->first = new_region;
        } else {
            region->next = new_region;
        }
        alloc->next = new_region;
        region = new_region;
    }
    quill_slab_t *slab = (quill_slab_t *) (
        region->data + (slab_size * region->next_i)
    );
    slab->owner = alloc;
    region->next_i += 1;
    return slab->data;
}

void quill_buffer_free(void *buffer) {
    quill_slab_t *slab = (quill_slab_t *) (
        ((uint8_t *) buffer) - offsetof(quill_slab_t, data)
    );
    quill_slab_alloc_t *alloc = slab->owner;
    if(alloc == NULL) {
        FALLBACK_FREE(slab);
        return;
    }
    slab->next_free = alloc->next_free;
    alloc->next_free = slab;
}