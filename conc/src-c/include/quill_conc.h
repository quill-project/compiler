
#ifndef QUILL_CONC_H
#define QUILL_CONC_H

#include <quill.h>


typedef struct quill_mutex_layout {
    quill_mutex_t lock;
    quill_struct_t value;
} quill_mutex_layout_t;


#ifdef _WIN32
    typedef CONDITION_VARIABLE quill_conc_cond_t;
#else
    typedef pthread_cond_t quill_conc_cond_t;
#endif

void quill_conc_cond_init(quill_conc_cond_t *cond);
void quill_conc_cond_wait(quill_conc_cond_t *cond, quill_mutex_t *mutex);
void quill_conc_cond_notify(quill_conc_cond_t *cond);
void quill_conc_cond_notify_all(quill_conc_cond_t *cond);
void quill_conc_cond_destroy(quill_conc_cond_t *cond);


typedef struct quill_conc_monitor_layout {
    quill_mutex_t lock;
    quill_conc_cond_t cond;
    quill_struct_t value;
} quill_conc_monitor_layout_t;


#ifdef _WIN32
    #include <process.h>

    #define QUILL_CONC_THREAD_RET_TYPE unsigned __stdcall
    #define QUILL_CONC_THREAD_RET_VAL 0
#else
    #define QUILL_CONC_THREAD_RET_TYPE void *
    #define QUILL_CONC_THREAD_RET_VAL NULL
#endif

typedef struct quill_conc_thread_layout {
    quill_mutex_t lock;
    quill_closure_t task;
    quill_conc_cond_t joined;
    quill_bool_t done;
} quill_conc_thread_layout_t;

QUILL_CONC_THREAD_RET_TYPE quill_conc_thread_start(void *context);

#endif