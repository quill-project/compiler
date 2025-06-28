
#include <quill.h>

typedef struct quill_conc_mutex_layout {
    quill_mutex_t lock;
    quill_struct_t value;
} quill_conc_mutex_layout_t;