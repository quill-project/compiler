
#include <quill.h>
#include <stdio.h>
#include <inttypes.h>
#include <string.h>

#define PRIqd PRId64 // quill_int_t
#define PRIqu PRIu64 // quill_uint_t
#define PRIqf "f"   // quill_float_t

quill_int_t quill_point_encode_length(uint32_t point) {
    if(point <= 0x00007F) { return 1; }
    if(point <= 0x0007FF) { return 2; }
    if(point >= 0x00D800 && point <= 0x00DFFF) {
        quill_panic(quill_string_from_static_cstr(
            "Attempt to encode surrogate surrogate codepoints\n"
        ));
    }
    if(point <= 0x00FFFF) { return 3; }
    if(point <= 0x10FFFF) { return 4; }
    quill_panic(quill_string_from_static_cstr(
        "Codepoint too large to encode\n"
    ));
    return 0;
}

quill_int_t quill_point_encode(uint32_t point, uint8_t *dest) {
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
        "Codepoint too large to encode\n"
    ));
    return 0;
}

quill_int_t quill_point_decode_length(uint8_t start) {
    if((start & 0x80 /* 10000000 */) == 0x00 /* 00000000 */) { return 1; }
    if((start & 0xE0 /* 11100000 */) == 0xC0 /* 11000000 */) { return 2; }
    if((start & 0xF0 /* 11110000 */) == 0xE0 /* 11100000 */) { return 3; }
    if((start & 0xF8 /* 11111000 */) == 0xF0 /* 11110000 */) { return 4; }
    quill_panic(quill_string_from_static_cstr(
        "String improperly encoded\n"
    ));
    return 0;
}

uint32_t quill_point_decode(const uint8_t *data) {
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
        "String improperly encoded\n"
    ));
    return 0;
}

quill_string_t quill_string_from_points(
    uint32_t *points, quill_int_t length_points
) {
    quill_int_t length_bytes = 0;
    for(quill_int_t i = 0; i < length_points; i += 1) {
        length_bytes += quill_point_encode_length(points[i]);
    }
    quill_alloc_t *alloc = quill_malloc(sizeof(uint8_t) * length_bytes, NULL);
    uint8_t *data = (uint8_t *) alloc->data;
    quill_int_t offset = 0;
    for(quill_int_t i = 0; i < length_points; i += 1) {
        offset += quill_point_encode(points[i], data + offset);
    }
    return (quill_string_t) {
        .alloc = alloc,
        .data = data,
        .length_bytes = length_bytes,
        .length_points = length_points
    };
}

quill_string_t quill_string_from_static_cstr(const char *cstr) {
    uint8_t *data = (uint8_t *) cstr;
    quill_int_t length_bytes = 0;
    quill_int_t length_points = 0;
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

quill_string_t quill_string_from_temp_cstr(const char *cstr) {
    uint8_t *data = (uint8_t *) cstr;
    quill_string_t res;
    res.length_bytes = 0;
    res.length_points = 0;
    for(;;) {
        uint8_t current = data[res.length_bytes];
        if(current == '\0') { break; }
        res.length_bytes += quill_point_decode_length(current);
        res.length_points += 1;
    }
    res.alloc = quill_malloc(sizeof(uint8_t) * res.length_bytes, NULL);
    res.data = res.alloc->data;
    memcpy(res.alloc->data, data, sizeof(uint8_t) * res.length_bytes);
    return res;
}

char *quill_malloc_cstr_from_string(quill_string_t string) {
    char *buffer = malloc(string.length_bytes + 1);
    memcpy(buffer, string.data, string.length_bytes);
    buffer[string.length_bytes] = '\0';
    return buffer;
}

quill_string_t quill_string_from_int(quill_int_t i) {
    quill_int_t length_bytes = snprintf(NULL, 0, "%" PRIqd, i);
    size_t buffer_size = (size_t) (sizeof(uint8_t) * (length_bytes + 1));
    quill_string_t res;
    res.length_points = length_bytes; // snprintf will only output ASCII
    res.length_bytes = length_bytes;
    res.alloc = quill_malloc(buffer_size, NULL);
    res.data = res.alloc->data;
    snprintf(res.alloc->data, buffer_size, "%" PRIqd, i);
    return res;
}

static quill_int_t trimmed_float_str_length(
    const uint8_t *data, quill_int_t og_length
) {
    quill_int_t new_length = og_length;
    while(new_length > 1 && data[new_length - 1] == '0') {
        new_length -= 1;
    }
    if(new_length > 1 && data[new_length - 1] == '.') {
        new_length -= 1;
    }
    return new_length;
}

quill_string_t quill_string_from_float(quill_float_t f) {
    if(isnan(f)) { 
        return quill_string_from_static_cstr("nan"); 
    }
    if(isinf(f)) { 
        return f > 0? quill_string_from_static_cstr("inf")
            : quill_string_from_static_cstr("-inf"); 
    }
    quill_int_t length_bytes = snprintf(NULL, 0, "%" PRIqf, f);
    size_t buffer_size = (size_t) (sizeof(uint8_t) * (length_bytes + 1));
    quill_string_t res;
    res.alloc = quill_malloc(buffer_size, NULL);
    res.data = res.alloc->data;
    snprintf(res.alloc->data, buffer_size, "%" PRIqf, f);
    quill_int_t length_trim = trimmed_float_str_length(res.data, length_bytes);
    res.length_points = length_trim; // snprintf will only output ASCII
    res.length_bytes = length_trim;
    return res;
}