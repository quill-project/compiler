
#include <quill.h>

quill_list_t quill_program_args;

static void quill_runtime_init_args(int argc, char **argv) {
    quill_program_args = quill_malloc(sizeof(quill_list_layout_t), NULL);
    quill_list_layout_t *args_info
        = (quill_list_layout_t *) quill_program_args->data;
    args_info->capacity = argc;
    args_info->length = argc;
    args_info->buffer = QUILL_LIST_BUFFER_ALLOC(sizeof(quill_string_t) * argc);
    quill_string_t *args_data = (quill_string_t *) args_info->buffer;
    for(size_t i = 0; i < argc; i += 1) {
        args_data[i] = quill_string_from_static_cstr(argv[i]);
    }
}

void quill_runtime_init_global(int argc, char **argv) {
    #ifdef _WIN32
        SetConsoleCP(65001);
        SetConsoleOutputCP(65001);
    #endif
    quill_alloc_init_global();
    quill_runtime_init_args(argc, argv);
}

void quill_runtime_destruct_global(void) {
    // nothing to do
}

void quill_runtime_init_thread(void) {
    quill_alloc_init_thread();
}

void quill_runtime_destruct_thread(void) {
    quill_alloc_destruct_thread();
}
