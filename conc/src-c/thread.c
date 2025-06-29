
#include <quill_conc.h>

QUILL_CONC_THREAD_RET_TYPE quill_conc_thread_start(void *context) {
    quill_runtime_init_thread();
    quill_struct_t thread_obj = (quill_struct_t) context;
    quill_conc_thread_layout_t *thread_data 
        = (quill_conc_thread_layout_t *) thread_obj->data;
    QUILL_CALL_CLOSURE_NA(
        thread_data->task, 
        QUILL_CLOSURE_FPTR_NA(thread_data->task, quill_unit_t)
    );
    quill_mutex_lock(&thread_data->lock);
    thread_data->done = QUILL_TRUE;
    quill_conc_cond_notify_all(&thread_data->joined);
    quill_mutex_unlock(&thread_data->lock);
    quill_rc_dec(thread_obj);
    quill_runtime_destruct_thread();
    return QUILL_CONC_THREAD_RET_VAL;
}