
#include <quill_os.h>

#ifdef _WIN32
    quill_mutex_t quill_os_env_lock;
    static volatile LONG lock_initialized = 0;

    void quill_os_init_env_lock() {
        if(InterlockedCompareExchange(&lock_initialized, 1, 0) == 0) {
            quill_mutex_init(&quill_os_env_lock);
        }
    }
#else
    quill_mutex_t quill_os_env_lock = PTHREAD_MUTEX_INITIALIZER;

    void quill_os_init_env_lock() {
        // nothing to do
    }
#endif