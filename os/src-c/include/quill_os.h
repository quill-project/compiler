
#ifndef QUILL_OS_H
#define QUILL_OS_H

#include <quill.h>

#include <locale.h>
#include <errno.h>
#include <stdio.h>
#include <string.h>

#ifdef _WIN32
    #include <windows.h>
    #include <direct.h>

    #define QUILL_OS_STRING_AS_WIDE(s, r, e) \
        int r##_length = MultiByteToWideChar( \
            CP_UTF8, 0, (s).data, (int) (s).length_bytes, NULL, 0 \
        ); \
        if(r##_length == 0) { \
            return e; \
        } \
        wchar_t r[r##_length + 1]; \
        if(MultiByteToWideChar( \
            CP_UTF8, 0, (char *) (s).data, (int) (s).length_bytes, \
            r, r##_length \
        ) == 0) { \
            return e; \
        } \
        r[r##_length] = L'\0';

    #define QUILL_OS_STRING_FROM_WIDE(s, sl, r, e) \
        quill_string_t r; \
        r.length_bytes = WideCharToMultiByte( \
            CP_UTF8, 0, (s), (sl), NULL, 0, NULL, NULL \
        ); \
        if (r.length_bytes == 0) { \
            return e; \
        } \
        r.length_points = 0; \
        r.alloc = quill_malloc(sizeof(uint8_t) * r.length_bytes, NULL); \
        r.data = r.alloc->data; \
        if(WideCharToMultiByte( \
            CP_UTF8, 0, (s), (sl), (char *) r.alloc->data, r.length_bytes, NULL, NULL \
        ) == 0) { \
            return e; \
        } \
        for(quill_int_t o = 0; o < r.length_bytes; r.length_points += 1) { \
            o += quill_point_decode_length(r.data[o]); \
        }

    static quill_int_t quill_os_win_to_errno(DWORD err) {
        switch(err) {
            case ERROR_FILE_NOT_FOUND:
            case ERROR_PATH_NOT_FOUND:
            case ERROR_INVALID_DRIVE:
            case ERROR_BAD_NETPATH:
            case ERROR_INVALID_NAME:
            case ERROR_DIRECTORY: return ENOENT;

            case ERROR_ACCESS_DENIED:
            case ERROR_SHARING_VIOLATION:
            case ERROR_LOCK_VIOLATION:
            case ERROR_CURRENT_DIRECTORY: return EACCES;

            case ERROR_FILE_EXISTS:
            case ERROR_ALREADY_EXISTS: return EEXIST;

            case ERROR_INVALID_HANDLE:
            case ERROR_INVALID_PARAMETER: return EINVAL;

            case ERROR_NOT_ENOUGH_MEMORY:
            case ERROR_OUTOFMEMORY: return ENOMEM;

            case ERROR_GEN_FAILURE:
            case ERROR_IO_DEVICE: return EIO;

            case ERROR_DISK_FULL:            return ENOSPC;
            case ERROR_WRITE_PROTECT:        return EROFS;
            case ERROR_CALL_NOT_IMPLEMENTED: return ENOSYS;
            case ERROR_NOT_SUPPORTED:        return ENOTSUP;
            case ERROR_DIR_NOT_EMPTY:        return ENOTEMPTY;
            case ERROR_TOO_MANY_OPEN_FILES:  return EMFILE;
            case ERROR_FILENAME_EXCED_RANGE: return ENAMETOOLONG;
            case ERROR_BROKEN_PIPE:          return EPIPE;
            default:                         return EINVAL;
        }
    }

    typedef struct quill_os_process_layout {
        quill_mutex_t lock;
        PROCESS_INFORMATION pi;
        quill_bool_t is_done;
        quill_int_t exit_code;
        HANDLE out_read;
        HANDLE err_read;
        HANDLE in_write;
    } quill_os_process_layout_t;

    quill_string_t quill_os_read_pipe(HANDLE pipe_read);
#else
    #include <sys/types.h>
    #include <sys/stat.h>
    #include <sys/wait.h>
    #include <unistd.h>
    #include <signal.h>
    #include <dirent.h>

    extern char **environ;

    typedef struct quill_os_process_layout {
        quill_mutex_t lock;
        pid_t pid;
        quill_bool_t is_done;
        quill_int_t exit_code;
        int out_read;
        int err_read;
        int in_write;
    } quill_os_process_layout_t;

    quill_string_t quill_os_read_pipe(int pipe_read);
#endif

#define QUILL_OS_STRING_AS_NT(s, r) \
    char r[(s).length_bytes + 1]; \
    memcpy(r, (s).data, (s).length_bytes); \
    r[(s).length_bytes] = '\0';


extern quill_mutex_t quill_os_env_lock;

void quill_os_init_env_lock();


#ifdef _WIN32
    #define QUILL_ENV_IS_WINDOWS QUILL_TRUE
#else
    #define QUILL_ENV_IS_WINDOWS QUILL_FALSE
#endif

#if defined(__unix__) || defined(__unix) || defined(__APPLE__)
    #define QUILL_ENV_IS_UNIX QUILL_TRUE
#else
    #define QUILL_ENV_IS_UNIX QUILL_FALSE
#endif

#ifdef __APPLE__
    #include <TargetConditionals.h>
    #if TARGET_OS_MAC && !TARGET_OS_IPHONE
        #define QUILL_ENV_IS_OSX QUILL_TRUE
        #define QUILL_ENV_IS_IOS QUILL_FALSE
    #elif TARGET_OS_IPHONE
        #define QUILL_ENV_IS_OSX QUILL_FALSE
        #define QUILL_ENV_IS_IOS QUILL_TRUE
    #else
        #define QUILL_ENV_IS_OSX QUILL_FALSE
        #define QUILL_ENV_IS_IOS QUILL_FALSE
    #endif
#else
    #define QUILL_ENV_IS_OSX QUILL_FALSE
    #define QUILL_ENV_IS_IOS QUILL_FALSE
#endif

#ifdef __linux__
    #define QUILL_ENV_IS_LINUX QUILL_TRUE
#else
    #define QUILL_ENV_IS_LINUX QUILL_FALSE
#endif

#ifdef __ANDROID__
    #define QUILL_ENV_IS_ANDROID QUILL_TRUE
#else
    #define QUILL_ENV_IS_ANDROID QUILL_FALSE
#endif

#endif