
#include <quill_conc.h>

#ifdef _WIN32
    void quill_conc_cond_init(quill_conc_cond_t *cond) {
        InitializeConditionVariable(cond);
    }

    void quill_conc_cond_wait(quill_conc_cond_t *cond, quill_mutex_t *mutex) {
        SleepConditionVariableCS(cond, mutex, INFINITE);
    }

    void quill_conc_cond_notify(quill_conc_cond_t *cond) {
        WakeConditionVariable(cond);
    }

    void quill_conc_cond_notify_all(quill_conc_cond_t *cond) {
        WakeAllConditionVariable(cond);
    }

    void quill_conc_cond_destroy(quill_conc_cond_t *cond) {
        (void) cond;
    }
#else
    void quill_conc_cond_init(quill_conc_cond_t *cond) {
        if(pthread_cond_init(cond, NULL) == 0) { return; }
        quill_panic(quill_string_from_static_cstr(
            "Failed to initialize condition variable\n"
        ));
    }

    void quill_conc_cond_wait(quill_conc_cond_t *cond, quill_mutex_t *mutex) {
        if(pthread_cond_wait(cond, mutex) == 0) { return; }
        quill_panic(quill_string_from_static_cstr(
            "Failed to wait for condition variable\n"
        ));
    }

    void quill_conc_cond_notify(quill_conc_cond_t *cond) {
        if(pthread_cond_signal(cond) == 0) { return; }
        quill_panic(quill_string_from_static_cstr(
            "Failed to notify through condition variable\n"
        ));
    }

    void quill_conc_cond_notify_all(quill_conc_cond_t *cond) {
        if(pthread_cond_broadcast(cond) == 0) { return; }
        quill_panic(quill_string_from_static_cstr(
            "Failed to notify all through condition variable\n"
        ));
    }

    void quill_conc_cond_destroy(quill_conc_cond_t *cond) {
        if(pthread_cond_destroy(cond) == 0) { return; }
        quill_panic(quill_string_from_static_cstr(
            "Failed to uninitialize condition variable\n"
        ));
    }
#endif