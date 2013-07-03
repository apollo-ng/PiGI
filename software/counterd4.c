#include <stdio.h>
#include <signal.h>
#include <errno.h>
#include <stdlib.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>

#define DAEMON_NAME "counterd"

  void daemonShutdown();
  void signal_handler(int sig);
  void daemonize(char *rundir, char *pidfile);

  int pidFilehandle;

  void signal_handler(int sig)
  {
    switch(sig)
    {
      case SIGHUP:
        printf("Received SIGHUP");
      break;
      case SIGINT:
      case SIGTERM:
        printf("Received SIGTERM - Daemon exiting");
        daemonShutdown();
        exit(EXIT_SUCCESS);
      break;
      default:
        printf("Unhandled signal %s", strsignal(sig));
      break;
    }
  }

  void daemonShutdown()
  {
    close(pidFilehandle);
  }

  void daemonize(char *rundir, char *pidfile)
  {
    int pid, sid, i;
    char str[10];
    struct sigaction newSigAction;
    sigset_t newSigSet;

    /* Check if parent process id is set */
    if (getppid() == 1)
    {
      /* PPID exists, therefore we are already a daemon */
      return;
    }

    /* Set signal mask - signals we want to block */
    sigemptyset(&newSigSet);
    sigaddset(&newSigSet, SIGCHLD); /* ignore child - i.e. we don't need to wait for it */
    sigaddset(&newSigSet, SIGTSTP); /* ignore TTY stop signals */
    sigaddset(&newSigSet, SIGTTOU); /* ignore TTY background writes */
    sigaddset(&newSigSet, SIGTTIN); /* ignore TTY background reads */
    sigprocmask(SIG_BLOCK, &newSigSet, NULL);   /* Block the above specified signals */

    /* Set up a signal handler */
    newSigAction.sa_handler = signal_handler;
    sigemptyset(&newSigAction.sa_mask);
    newSigAction.sa_flags = 0;

    /* Signals to handle */
    sigaction(SIGHUP, &newSigAction, NULL);     /* catch hangup signal */
    sigaction(SIGTERM, &newSigAction, NULL);    /* catch term signal */
    sigaction(SIGINT, &newSigAction, NULL);     /* catch interrupt signal */

    /* Fork*/
    pid = fork();

    if (pid < 0)
    {
      /* Could not fork */
      exit(EXIT_FAILURE);
    }

    if (pid > 0)
    {
      /* Child created ok, so exit parent process */
      printf("Child process created: %d\n", pid);
      exit(EXIT_SUCCESS);
    }

    /* Child continues */

    umask(027); /* Set file permissions 750 */

    /* Get a new process group */
    sid = setsid();

    if (sid < 0)
    {
      exit(EXIT_FAILURE);
    }

    /* close all descriptors */
    for (i = getdtablesize(); i >= 0; --i)
    {
      close(i);
    }

    /* Route I/O connections */

    /* Open STDIN */
    //i = open("/dev/null", O_RDWR);
    i = open("/tmp/test.log", O_RDWR);
    /* STDOUT */
    dup(i);

    /* STDERR */
    dup(i);

    chdir(rundir); /* change running directory */

    /* Ensure only one copy */
    pidFilehandle = open(pidfile, O_RDWR|O_CREAT, 0600);

    if (pidFilehandle == -1 )
    {
      /* Couldn't open lock file */
      printf("Could not open PID lock file %s, exiting", pidfile);
      exit(EXIT_FAILURE);
    }

    /* Try to lock file */
    if (lockf(pidFilehandle,F_TLOCK,0) == -1)
    {
      /* Couldn't get lock on lock file */
      printf("Could not lock PID lock file %s, exiting", pidfile);
      exit(EXIT_FAILURE);
    }

    /* Get and format PID */
    sprintf(str,"%d\n",getpid());

    /* write pid to lockfile */
    write(pidFilehandle, str, strlen(str));
  }

  int main()
  {
    printf("Daemon starting up");

    /* Deamonize */
    daemonize("/tmp/", "/tmp/daemon.pid");

    printf("Daemon running");

    while (1)
    {
      printf("Daemon says Hello");
      sleep(1);
    }
  }

