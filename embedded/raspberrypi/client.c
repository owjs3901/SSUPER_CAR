#include <sys/socket.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <arpa/inet.h>
#include <unistd.h>

int main(int argc, char *args[])
{
	struct sockaddr_in server;

	short port = 3901;

	int server_socket = socket(PF_INET, SOCK_STREAM, 0);
	server.sin_family = PF_INET;
	server.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
	server.sin_port = htons(port);

	if (connect(server_socket, (struct sockaddr *)&server, sizeof(struct sockaddr_in)) == -1)
	{
		perror("connect error");
		exit(1);
	}
	printf("connect\n");
	while (1)
	{
		char data[50] = "";
		fgets(data, 5, stdin);

		if (strcmp(data, "close\n") == 0)
			break;

		send(server_socket, data, 5, 0);
		printf("SEND DATA %s\n", data);
		memset(data, 0, 5);
		recv(server_socket, data, 50, 0);
		printf("RECV DATA %s\n", data);
	}
	close(server_socket);
}
