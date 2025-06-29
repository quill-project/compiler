
#include <quill.h>
#include <assert.h>

#ifdef _WIN32
    void quill_mutex_init(quill_mutex_t *mutex) {
        InitializeCriticalSection(mutex);
    }

    void quill_mutex_lock(quill_mutex_t *mutex) {
        EnterCriticalSection(mutex);
    }

    quill_bool_t quill_mutex_try_lock(quill_mutex_t *mutex) {
        return (quill_bool_t) TryEnterCriticalSection(mutex);
    }

    void quill_mutex_unlock(quill_mutex_t *mutex) {
        LeaveCriticalSection(mutex);
    }
    
    void quill_mutex_destroy(quill_mutex_t *mutex) {
        DeleteCriticalSection(mutex);
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

    void quill_mutex_init(quill_mutex_t *mutex) {
        pthread_once(&mutex_attr_once, &mutex_init_attr_once);
        assert(pthread_mutex_init(mutex, &mutex_attr) == 0);
    }

    void quill_mutex_lock(quill_mutex_t *mutex) {
        assert(pthread_mutex_lock(mutex) == 0);
    }

    quill_bool_t quill_mutex_try_lock(quill_mutex_t *mutex) {
        int r = pthread_mutex_trylock(mutex);
        if(r == EBUSY) { return QUILL_FALSE; }
        assert(r == 0);
        return QUILL_TRUE;
    }

    void quill_mutex_unlock(quill_mutex_t *mutex) {
        assert(pthread_mutex_unlock(mutex) == 0);
    }
    
    void quill_mutex_destroy(quill_mutex_t *mutex) {
        assert(pthread_mutex_destroy(mutex) == 0);
    }
#endif