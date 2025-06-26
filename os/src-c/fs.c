
#include <stdio.h>
#include <string.h>

#ifdef _WIN32
    #include <windows.h>

    #define QUILL_FS_ERR_RET_FALSE(x) QUILL_FALSE

    #define QUILL_FS_STRING_AS_WIDE(s, r, e) \
        int r##_length = MultiByteToWideChar( \
            CP_UTF8, 0, (s).data, (int) (s).length_bytes, NULL, 0 \
        ); \
        if(r##_length == 0) { \
            return e((quill_int_t) EINVAL); \
        } \
        wchar_t r[r##_length + 1]; \
        if(MultiByteToWideChar( \
            CP_UTF8, 0, (char *) (s).data, (int) (s).length_bytes, \
            r, r##_length \
        ) == 0) { \
            return e((quill_int_t) EINVAL); \
        } \
        r[r##_length] = L'\0';

    #define QUILL_FS_STRING_FROM_WIDE(s, sl, r, e) \
        quill_string_t r; \
        r.length_bytes = WideCharToMultiByte( \
            CP_UTF8, 0, (s), (sl), NULL, 0, NULL, NULL \
        ); \
        if (r.length_bytes == 0) { \
            return e((quill_int_t) EINVAL); \
        } \
        r.length_points = 0; \
        r.alloc = quill_malloc(sizeof(uint8_t) * r.length_bytes, NULL); \
        r.data = r.alloc->data; \
        if(WideCharToMultiByte( \
            CP_UTF8, 0, (s), (sl), (char *) r.alloc->data, r.length_bytes, NULL, NULL \
        ) == 0) { \
            return e((quill_int_t) EINVAL); \
        } \
        for(quill_int_t o = 0; o < r.length_bytes; r.length_points += 1) { \
            o += quill_point_decode_length(r.data[o]); \
        }

    static quill_int_t quill_fs_win_to_errno(DWORD err) {
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
#else
    #include <sys/types.h>
    #include <sys/stat.h>
    #include <unistd.h>
    #include <dirent.h>
#endif

#define QUILL_FS_STRING_AS_NT(s, r) \
    char r[(s).length_bytes + 1]; \
    memcpy(r, (s).data, (s).length_bytes); \
    r[(s).length_bytes] = '\0';