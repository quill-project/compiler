
#include <stdio.h>

int main(int argc, char **argv) {
    for(int argi = 0; argi < argc; argi += 1) {
        printf("[%d] %s\n", argi, argv[argi]);
    }
    return 0;
}
    