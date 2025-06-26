
#include <stdio.h>
#include <string.h>

#ifdef _WIN32
    #include <windows.h>

    #define QUILL_FS_ERR_RET_FALSE(x) QUILL_FALSE

    #define QUILL_FS_STRING_AS_WIN_WIDE(s, r, e) \
        int r##_length_bytes = MultiByteToWideChar( \
            CP_UTF8, 0, (s).data, (int) (s).length_bytes, NULL, 0 \
        ); \
        if(r##_length_bytes == 0) { \
            return e((quill_int_t) EINVAL); \
        } \
        wchar_t r[r##_length_bytes + 1]; \
        if(MultiByteToWideChar( \
            CP_UTF8, 0, (s).data, (int) (s).length_bytes, \
            r, r##_length_bytes \
        ) == 0) { \
            return e((quill_int_t) EINVAL); \
        } \
        r[r##_length_bytes] = L'\0';
#else
    #include <sys/stat.h>
    #include <unistd.h>

    #define QUILL_FS_STRING_AS_NT(s, r) \
        char r[(s).length_bytes + 1]; \
        memcpy(r, (s).data, (s).length_bytes); \
        r[(s).length_bytes] = '\0';
#endif