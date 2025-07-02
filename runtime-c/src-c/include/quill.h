
// MIT License
// 
// Copyright (c) 2025 schwalbe-t
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

#ifndef QUILL_RUNTIME_H
#define QUILL_RUNTIME_H

#include <stdint.h>
#include <stdlib.h>
#include <math.h>


typedef uint8_t quill_unit_t;
typedef int64_t quill_int_t;
typedef uint64_t quill_uint_t;
typedef double quill_float_t;
typedef uint8_t quill_bool_t;


#ifdef __STDC_NO_ATOMICS__
    #error "Atomic operations must be supported"
#else
    #include <stdatomic.h>
#endif

#ifdef _WIN32
    #include <windows.h>
    typedef CRITICAL_SECTION quill_mutex_t;
#else
    #include <pthread.h>
    typedef pthread_mutex_t quill_mutex_t;
#endif

void quill_mutex_init(quill_mutex_t *mutex);
void quill_mutex_lock(quill_mutex_t *mutex);
quill_bool_t quill_mutex_try_lock(quill_mutex_t *mutex);
void quill_mutex_unlock(quill_mutex_t *mutex);
void quill_mutex_destroy(quill_mutex_t *mutex);

typedef struct quill_alloc quill_alloc_t;

typedef quill_unit_t (*quill_destructor_t)(quill_alloc_t *alloc);

typedef struct quill_alloc {
    _Atomic(uint64_t) rc;
    quill_destructor_t destructor;
    uint8_t data[];
} quill_alloc_t;


typedef struct quill_string {
    quill_alloc_t *alloc;
    const uint8_t *data;
    quill_int_t length_points;
    quill_int_t length_bytes;
} quill_string_t;

typedef quill_alloc_t *quill_struct_t;

typedef quill_alloc_t *quill_enum_t;

typedef const void *quill_fptr_t;

typedef quill_alloc_t *quill_capture_t;

typedef struct quill_closure {
    quill_alloc_t *alloc;
    quill_fptr_t body;
} quill_closure_t;

typedef struct quill_list_layout {
    void *buffer;
    quill_int_t capacity;
    quill_int_t length;
} quill_list_layout_t;

#define QUILL_LIST_BUFFER_ALLOC quill_alloc_alloc
#define QUILL_LIST_BUFFER_FREE quill_alloc_free

typedef quill_alloc_t *quill_list_t;


#define QUILL_UNIT 0
#define QUILL_FALSE 0
#define QUILL_TRUE 1
#define QUILL_EMPTY_STRING ((quill_string_t) { .alloc = NULL, .data = NULL, .length_bytes = 0, .length_points = 0 })
#define QUILL_NULL_ALLOC ((quill_alloc_t *) NULL)
#define QUILL_NULL_STRUCT QUILL_NULL_ALLOC
#define QUILL_NULL_ENUM QUILL_NULL_ALLOC
#define QUILL_NULL_CLOSURE ((quill_closure_t) { .alloc = NULL, .body = NULL })
#define QUILL_NULL_LIST QUILL_NULL_ALLOC


void quill_print(quill_string_t text);
void quill_eprint(quill_string_t text);
void quill_panic(quill_string_t reason);


void quill_alloc_init_global(void);
void quill_alloc_init_thread(void);
void quill_alloc_destruct_thread(void);
void *quill_alloc_alloc(size_t n);
void quill_alloc_free(void *alloc);


quill_int_t quill_point_encode_length(uint32_t point);
quill_int_t quill_point_encode(uint32_t point, uint8_t *dest);
quill_int_t quill_point_decode_length(uint8_t start);
uint32_t quill_point_decode(const uint8_t *data);
quill_string_t quill_string_from_points(
    uint32_t *points, quill_int_t length_points
);
quill_string_t quill_string_from_static_cstr(const char* cstr);
quill_string_t quill_string_from_temp_cstr(const char *cstr);
char *quill_malloc_cstr_from_string(quill_string_t string);
quill_string_t quill_string_from_int(quill_int_t i);
quill_string_t quill_string_from_float(quill_float_t f);


static quill_alloc_t *quill_malloc(size_t n, quill_destructor_t destructor) {
    if(n == 0) { return NULL; }
    quill_alloc_t *alloc = quill_alloc_alloc(sizeof(quill_alloc_t) + n);
    if(alloc == NULL) {
        quill_panic(quill_string_from_static_cstr(
            "Unable to allocate memory\n"
        ));
    }
    alloc->rc = 1;
    alloc->destructor = destructor;
    return alloc;
}

static void quill_rc_add(quill_alloc_t *alloc) {
    if(alloc == NULL) { return; }
    atomic_fetch_add_explicit(&alloc->rc, 1, memory_order_relaxed);
}

static void quill_unit_rc_add(quill_unit_t v) { (void) v; }
static void quill_int_rc_add(quill_int_t v) { (void) v; }
static void quill_float_rc_add(quill_float_t v) { (void) v; }
static void quill_bool_rc_add(quill_bool_t v) { (void) v; }
static void quill_string_rc_add(quill_string_t v) { quill_rc_add(v.alloc); }
static void quill_closure_rc_add(quill_closure_t v) { quill_rc_add(v.alloc); }

static void quill_rc_dec(quill_alloc_t *alloc) {
    if(alloc == NULL) { return; }
    // 'atomic_fetch_sub_explicit' returns the value before the subtraction
    if(atomic_fetch_sub_explicit(&alloc->rc, 1, memory_order_acq_rel) != 1) { 
        return; 
    }
    atomic_thread_fence(memory_order_acquire);
    quill_destructor_t destructor = alloc->destructor;
    if(destructor != NULL) { destructor(alloc); }
    quill_alloc_free(alloc);
}

static void quill_unit_rc_dec(quill_unit_t v) { (void) v; }
static void quill_int_rc_dec(quill_int_t v) { (void) v; }
static void quill_float_rc_dec(quill_float_t v) { (void) v; }
static void quill_bool_rc_dec(quill_bool_t v) { (void) v; }
static void quill_string_rc_dec(quill_string_t v) { quill_rc_dec(v.alloc); }
static void quill_closure_rc_dec(quill_closure_t v) { quill_rc_dec(v.alloc); }


static quill_unit_t quill_captured_noop_free(quill_alloc_t *alloc) {
    (void) alloc;
    return QUILL_UNIT;
}

static quill_unit_t quill_captured_string_free(quill_alloc_t *alloc) {
    quill_string_t *ref = (quill_string_t *) alloc->data;
    quill_rc_dec(ref->alloc);
    return QUILL_UNIT;
}

static quill_unit_t quill_captured_ref_free(quill_alloc_t *alloc) {
    quill_alloc_t **ref = (quill_alloc_t **) alloc->data;
    quill_rc_dec(*ref);
    return QUILL_UNIT;
}

static quill_unit_t quill_captured_closure_free(quill_alloc_t *alloc) {
    quill_closure_t *ref = (quill_closure_t *) alloc->data;
    quill_rc_dec(ref->alloc);
    return QUILL_UNIT;
}

#define QUILL_UNIT_CAPTURE quill_malloc(sizeof(quill_unit_t), &quill_captured_noop_free)
#define QUILL_INT_CAPTURE quill_malloc(sizeof(quill_int_t), &quill_captured_noop_free)
#define QUILL_FLOAT_CAPTURE quill_malloc(sizeof(quill_float_t), &quill_captured_noop_free)
#define QUILL_BOOL_CAPTURE quill_malloc(sizeof(quill_bool_t), &quill_captured_noop_free)
#define QUILL_STRING_CAPTURE quill_malloc(sizeof(quill_string_t), &quill_captured_string_free)
#define QUILL_STRUCT_CAPTURE quill_malloc(sizeof(quill_struct_t), &quill_captured_ref_free)
#define QUILL_ENUM_CAPTURE quill_malloc(sizeof(quill_enum_t), &quill_captured_ref_free)
#define QUILL_CLOSURE_CAPTURE quill_malloc(sizeof(quill_closure_t), &quill_captured_closure_free)
#define QUILL_LIST_CAPTURE quill_malloc(sizeof(quill_list_t), &quill_captured_ref_free)

#define QUILL_CLOSURE_FPTR(closure, ret_type, ...) \
    ((ret_type (*)(quill_alloc_t *, __VA_ARGS__)) (closure).body)

#define QUILL_CLOSURE_FPTR_NA(closure, ret_type) \
    ((ret_type (*)(quill_alloc_t *)) (closure).body)

#define QUILL_CALL_CLOSURE(closure, closure_fptr, ...) \
    (closure_fptr)((closure).alloc, __VA_ARGS__)

#define QUILL_CALL_CLOSURE_NA(closure, closure_fptr) \
    (closure_fptr)((closure).alloc)


// DO NOT MUTATE!
extern quill_list_t quill_program_args;

void quill_runtime_init_global(int argc, char **argv);
void quill_runtime_destruct_global(void);
void quill_runtime_init_thread(void);
void quill_runtime_destruct_thread(void);

#endif