
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


typedef struct quill_alloc quill_alloc_t;

typedef quill_unit_t (*quill_destructor_t)(quill_alloc_t *alloc);

typedef struct quill_alloc {
    uint64_t rc;
    quill_destructor_t destructor;
    uint8_t data[];
} quill_alloc_t;


typedef struct quill_string {
    quill_alloc_t *alloc;
    const char *data;
    quill_uint_t length_points;
    quill_uint_t length_bytes;
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
    quill_uint_t capacity;
    quill_uint_t length;
} quill_list_layout_t;

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


static quill_alloc_t *quill_malloc(size_t n, quill_destructor_t destructor) {
    if(n == 0) { return NULL; }
    quill_alloc_t *alloc = malloc(sizeof(quill_alloc_t) + n);
    alloc->rc = 1;
    alloc->destructor = destructor;
    return alloc;
}

static void quill_rc_add(quill_alloc_t *alloc) {
    if(alloc == NULL) { return; }
    alloc->rc += 1;
}

static void quill_rc_dec(quill_alloc_t *alloc) {
    if(alloc == NULL) { return; }
    alloc->rc -= 1;
    if(alloc->rc > 0) { return; }
    quill_destructor_t destructor = alloc->destructor;
    if(destructor != NULL) { destructor(alloc); }
    free(alloc);
}


void quill_println(quill_string_t line);
void quill_panic(quill_string_t reason);


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

#endif