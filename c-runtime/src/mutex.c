
#include <quill.h>

#ifdef _WIN32
    void quill_mutex_init(quill_mutex_t *m) {
        InitializeCriticalSection(m);
    }

    void quill_mutex_lock(quill_mutex_t *m) {
        EnterCriticalSection(m);
    }

    quill_bool_t quill_mutex_try_lock(quill_mutex_t *m) {
        return (quill_bool_t) TryEnterCriticalSection(m);
    }

    void quill_mutex_unlock(quill_mutex_t *m) {
        LeaveCriticalSection(m);
    }

    void quill_mutex_destroy(quill_mutex_t *m) {
        DeleteCriticalSection(m);
    }
#else
    #include <errno.h>

    #ifndef PTHREAD_MUTEX_RECURSIVE
        #define PTHREAD_MUTEX_RECURSIVE PTHREAD_MUTEX_RECURSIVE_NP
    #endif

    static pthread_mutexattr_t mutex_attr;
    static pthread_once_t mutex_attr_once = PTHREAD_ONCE_INIT;

    static void mutex_init_attr_once(void) {
        pthread_mutexattr_init(&mutex_attr);
        pthread_mutexattr_settype(&mutex_attr, PTHREAD_MUTEX_RECURSIVE);
    }

    void quill_mutex_init(quill_mutex_t *m) {
        pthread_once(&mutex_attr_once, &mutex_init_attr_once);
        if(pthread_mutex_init(m, &mutex_attr) == 0) { return; }
        quill_panic(quill_string_from_static_cstr(
            "Failed to initialize mutex"
        ));
    }

    void quill_mutex_lock(quill_mutex_t *m) {
        if(pthread_mutex_lock(m) == 0) { return; }
        quill_panic(quill_string_from_static_cstr(
            "Failed to acquire ownership of mutex"
        ));
    }

    quill_bool_t quill_mutex_try_lock(quill_mutex_t *m) {
        int r = pthread_mutex_trylock(m);
        if(r == 0) { return QUILL_TRUE; }
        if(r == EBUSY) { return QUILL_FALSE; }
        quill_panic(quill_string_from_static_cstr(
            "Failed to acquire ownership of mutex"
        ));
    }

    void quill_mutex_unlock(quill_mutex_t *m) {
        if(pthread_mutex_unlock(m) == 0) { return; }
        quill_panic(quill_string_from_static_cstr(
            "Failed to release ownership of mutex"
        ));
    }

    void quill_mutex_destroy(quill_mutex_t *m) {
        if(pthread_mutex_destroy(m) == 0) { return; }
        quill_panic(quill_string_from_static_cstr(
            "Failed to uninitialize mutex"
        ));
    }
#endif