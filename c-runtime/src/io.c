
#include <quill.h>
#include <stdio.h>

void quill_println(quill_string_t line) {
    fwrite(line.data, sizeof(uint8_t), line.length_bytes, stdout);
}

void quill_panic(quill_string_t reason) {
    fwrite(reason.data, sizeof(uint8_t), reason.length_bytes, stderr);
    exit(1);
}