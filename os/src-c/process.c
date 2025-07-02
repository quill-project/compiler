
#include <quill_os.h>

#ifdef _WIN32
    quill_string_t quill_os_read_pipe(HANDLE pipe) {
        DWORD bytes_available;
        if(!PeekNamedPipe(pipe, NULL, 0, NULL, &bytes_available, NULL)) {
            quill_panic(quill_string_from_static_cstr(
                "Failed to read from pipe\n"
            ));
        }
        if(bytes_available == 0) {
            return quill_string_from_static_cstr("");
        }
        quill_string_t res;
        res.length_bytes = bytes_available;
        res.length_points = 0;
        res.alloc = quill_malloc(res.length_bytes, NULL);
        res.data = res.alloc->data;
        DWORD bytes_read;
        if(!ReadFile(pipe, res.alloc->data, res.length_bytes, &bytes_read, NULL)) {
            quill_rc_dec(res.alloc);
            quill_panic(quill_string_from_static_cstr(
                "Failed to read from pipe\n"
            ));
        }
        if((quill_int_t) bytes_read < res.length_bytes) {
            res.length_bytes = bytes_read;
        }
        for(size_t o = 0; o < res.length_bytes; res.length_points += 1) {
            o += quill_point_decode_length(res.data[o]);
        }
        return res;
    }
#else
    #include <sys/ioctl.h>

    quill_string_t quill_os_read_pipe(int pipe) {
        int bytes_available;
        if(ioctl(pipe, FIONREAD, &bytes_available) == -1) {
            quill_panic(quill_string_from_static_cstr(
                "Failed to read from pipe\n"
            ));
        }
        quill_string_t res;
        res.length_bytes = bytes_available;
        res.length_points = 0;
        res.alloc = quill_malloc(res.length_bytes, NULL);
        res.data = res.alloc->data;
        ssize_t bytes_read = read(pipe, res.alloc->data, res.length_bytes);
        if(bytes_read == -1) {
            quill_rc_dec(res.alloc);
            quill_panic(quill_string_from_static_cstr(
                "Failed to read from pipe\n"
            ));
        }
        if((quill_int_t) bytes_read < res.length_bytes) {
            res.length_bytes = bytes_read;
        }
        for(size_t o = 0; o < res.length_bytes; res.length_points += 1) {
            o += quill_point_decode_length(res.data[o]);
        }
        return res;
    }
#endif