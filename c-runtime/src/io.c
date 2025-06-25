
#include <quill.h>
#include <stdio.h>

void quill_println(quill_string_t line) {
    fwrite(line.data, sizeof(uint8_t), line.length_bytes, stdout);
    fwrite("\n", sizeof(char), 1, stdout);
}

void quill_panic(quill_string_t reason) {
    fwrite(reason.data, sizeof(uint8_t), reason.length_bytes, stderr);
    fwrite("\n", sizeof(char), 1, stderr);
    exit(1);
}