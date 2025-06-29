
#ifndef QUILL_STD_H
#define QUILL_STD_H

#include <quill.h>
#include <string.h>

typedef struct quill_std_strbuilder_layout {
    quill_int_t capacity_bytes;
    quill_int_t length_points;
    quill_int_t length_bytes;
    uint8_t *buffer;
} quill_std_strbuilder_layout_t;

#define QUILL_STD_STRBUILDER_BUFFER_ALLOC quill_alloc_alloc
#define QUILL_STD_STRBUILDER_BUFFER_FREE quill_alloc_free

#endif