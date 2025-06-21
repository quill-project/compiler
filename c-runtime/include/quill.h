
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
    const uint8_t *data;
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
    if(alloc == NULL) {
        quill_panic((quill_string_t) {
            .alloc = NULL,
            .data = "Unable to allocate memory",
            .length_bytes = 25,
            .length_points = 25
        });
    }
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


static quill_uint_t quill_point_encode_length(uint32_t point) {
    if(point <= 0x00007F) { return 1; }
    if(point <= 0x0007FF) { return 2; }
    if(point >= 0x00D800 && point <= 0x00DFFF) {
        quill_panic(quill_string_from_static_cstr(
            "Attempt to encode surrogate surrogate codepoints"
        ));
    }
    if(point <= 0x00FFFF) { return 3; }
    if(point <= 0x10FFFF) { return 4; }
    quill_panic(quill_string_from_static_cstr(
        "Codepoint too large to encode"
    ));
    return 0;
}

static quill_uint_t quill_point_encode(uint32_t point, uint8_t *dest) {
    if(point <= 0x00007F) {
        dest[0] = (uint8_t) point;
        return 1;
    }
    if(point <= 0x0007FF) {
        dest[0] = 0xC0 /* 11000000 */ | ((point >>  6) & 0x1F /* 00011111 */);
        dest[1] = 0x80 /* 10000000 */ | ((point >>  0) & 0x3F /* 00111111 */);
        return 2;
    }
    if(point <= 0x00FFFF) {
        dest[0] = 0xE0 /* 11100000 */ | ((point >> 12) & 0x0F /* 00001111 */);
        dest[1] = 0x80 /* 10000000 */ | ((point >>  6) & 0x3F /* 00111111 */);
        dest[2] = 0x80 /* 10000000 */ | ((point >>  0) & 0x3F /* 00111111 */);
        return 3;
    }
    if(point <= 0x10FFFF) {
        dest[0] = 0xF0 /* 11110000 */ | ((point >> 18) & 0x07 /* 00000111 */);
        dest[1] = 0x80 /* 10000000 */ | ((point >> 12) & 0x3F /* 00111111 */);
        dest[2] = 0x80 /* 10000000 */ | ((point >>  6) & 0x3F /* 00111111 */);
        dest[3] = 0x80 /* 10000000 */ | ((point >>  0) & 0x3F /* 00111111 */);
        return 4;
    }
    quill_panic(quill_string_from_static_cstr(
        "Codepoint too large to encode"
    ));
    return 0;
}

static quill_uint_t quill_point_decode_length(uint8_t start) {
    if((start & 0x80 /* 10000000 */) == 0x00 /* 00000000 */) { return 1; }
    if((start & 0xE0 /* 11100000 */) == 0xC0 /* 11000000 */) { return 2; }
    if((start & 0xF0 /* 11110000 */) == 0xE0 /* 11100000 */) { return 3; }
    if((start & 0xF8 /* 11111000 */) == 0xF0 /* 11110000 */) { return 4; }
    quill_panic(quill_string_from_static_cstr(
        "String improperly encoded"
    ));
    return 0;
}

static uint32_t quill_point_decode(const uint8_t *data) {
    uint32_t point = 0;
    if((data[0] & 0x80 /* 10000000 */) == 0x00 /* 00000000 */) {
        point |= (data[0] & 0x7F /* 01111111 */) <<  0;
        return point;
    }
    if((data[0] & 0xE0 /* 11100000 */) == 0xC0 /* 11000000 */) {
        point |= (data[0] & 0x1F /* 00011111 */) <<  6;
        point |= (data[1] & 0x3F /* 00111111 */) <<  0;
        return point;
    }
    if((data[0] & 0xF0 /* 11110000 */) == 0xE0 /* 11100000 */) {
        point |= (data[0] & 0x0F /* 00001111 */) << 12;
        point |= (data[1] & 0x3F /* 00111111 */) <<  6;
        point |= (data[2] & 0x3F /* 00111111 */) <<  0;
        return point;
    }
    if((data[0] & 0xF8 /* 11111000 */) == 0xF0 /* 11110000 */) {
        point |= (data[0] & 0x07 /* 00000111 */) << 18;
        point |= (data[1] & 0x3F /* 00111111 */) << 12;
        point |= (data[2] & 0x3F /* 00111111 */) <<  6;
        point |= (data[3] & 0x3F /* 00111111 */) <<  0;
        return point;
    }
    quill_panic(quill_string_from_static_cstr(
        "String improperly encoded"
    ));
    return 0;
}

static quill_string_t quill_string_from_points(
    uint32_t *points, quill_uint_t length_points
) {
    quill_uint_t length_bytes = 0;
    for(quill_uint_t i = 0; i < length_points; i += 1) {
        length_bytes += quill_point_encode_length(points[i]);
    }
    quill_alloc_t *alloc = quill_malloc(sizeof(uint8_t) * length_bytes, NULL);
    uint8_t *data = (uint8_t *) alloc->data;
    quill_uint_t offset = 0;
    for(quill_uint_t i = 0; i < length_points; i += 1) {
        offset += quill_point_encode(points[i], data + offset);
    }
    return (quill_string_t) {
        .alloc = alloc,
        .data = data,
        .length_bytes = length_bytes,
        .length_points = length_points
    };
}

static quill_string_t quill_string_from_static_cstr(const char* cstr) {
    uint8_t *data = (uint8_t *) cstr;
    quill_uint_t length_bytes = 0;
    quill_uint_t length_points = 0;
    for(;;) {
        uint8_t current = data[length_bytes];
        if(current == '\0') { break; }
        length_bytes += quill_point_decode_length(current);
        length_points += 1;
    }
    return (quill_string_t) {
        .alloc = NULL,
        .data = data,
        .length_bytes = length_bytes,
        .length_points = length_points
    };
}


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

#endif