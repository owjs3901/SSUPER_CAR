
#include <stdint.h>
#include <stdio.h>
#include <errno.h>
#include <string.h>
#include "wiringPi.h"
#include "wiringPiI2C.h"
#include <sys/socket.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <netdb.h>
//#include <bluetooth/bluetooth.h>
//#include <bluetooth/hci.h>
//#include <bluetooth/hci_lib.h>

#define SLAVE_Address 0x3A

#define MAXTIMINGS 83

#define DHTPIN 7

int dht11_dat[5] = {
    0,
};

float humidity = 0, temperature = 0;

void read_dht11_dat()
{
  uint8_t laststate = HIGH;
  uint8_t counter = 0;
  uint8_t j = 0, i;
  uint8_t flag = HIGH;
  uint8_t state = 0;

  float f;

  dht11_dat[0] = dht11_dat[1] = dht11_dat[2] = dht11_dat[3] = dht11_dat[4] = 0;

  pinMode(DHTPIN, OUTPUT);
  digitalWrite(DHTPIN, LOW);
  delay(18);

  digitalWrite(DHTPIN, HIGH);
  delayMicroseconds(30);
  pinMode(DHTPIN, INPUT);

  for (i = 0; i < MAXTIMINGS; i++)
  {
    counter = 0;
    while (digitalRead(DHTPIN) == laststate)
    {
      counter++;
      delayMicroseconds(1);

      if (counter == 200)
        break;
    }

    laststate = digitalRead(DHTPIN);

    if (counter == 200)
      break; // if while breaked by timer, break for

    if ((i >= 4) && (i % 2 == 0))
    {
      dht11_dat[j / 8] <<= 1;
      if (counter > 20)
        dht11_dat[j / 8] |= 1;
      j++;
    }
  }

  if ((j >= 40) && (dht11_dat[4] == ((dht11_dat[0] + dht11_dat[1] + dht11_dat[2] + dht11_dat[3]) & 0xff)))
  {
    printf("humidity = %d.%d %% Temperature = %d.%d *C \n", dht11_dat[0], dht11_dat[1], dht11_dat[2], dht11_dat[3]);
    humidity = dht11_dat[0];
    humidity += (float)dht11_dat[1] * 0.1;
    temperature = dht11_dat[2];
    temperature += (float)dht11_dat[3] * 0.1;
  }

  else
    printf("humidity = %.1f %% Temperature = %.1f *C\n", humidity, temperature);
}

int server_socket = -1;

void connection()
{
  struct sockaddr_in server;

  short port = 3001;

  server_socket = socket(PF_INET, SOCK_STREAM, 0);
  server.sin_family = PF_INET;

  struct hostent *host = gethostbyname("mbs-b.com");

  server.sin_addr.s_addr = inet_addr(inet_ntoa(*(struct in_addr *)host->h_addr_list[0]));
  server.sin_port = htons(port);

  if (connect(server_socket, (struct sockaddr *)&server, sizeof(struct sockaddr_in)) == -1)
  {
    exit(1);
  }

}

int main(void)
{
  int rtc, i;
  int rawTemp[2];

  float SensorTemp, ObjTemp;
  connection();

  wiringPiSetup(); // Wiring Pi setup

  delay(1000); // Waiting for sensor initialization

  if ((rtc = wiringPiI2CSetup(SLAVE_Address)) == -1) // Slave Adr = 0x3A
  {
    fprintf(stderr, "Unable to initialise I2C : %s\n", strerror(errno));
    return 1;
  }

  while (1)
  {
    for (i = 0; i < 2; i++)
    {
      rawTemp[i] = wiringPiI2CReadReg16(rtc, 0x06 + i);
      delay(1); //Don't delete this line
    }
    SensorTemp = (float)rawTemp[0] * 0.02 - 273.15;
    ObjTemp = (float)rawTemp[1] * 0.02 - 273.15;

    printf("SenT:%3.2f, ObjT:%3.2f\n", SensorTemp, ObjTemp);
    read_dht11_dat();
    delay(100);

    char data[100] = {0,};

    sprintf(data, "%f %f %f", humidity, temperature, ObjTemp);

    int sendFlag = send(server_socket, data, 100, 0);
    if(sendFlag < 0){
      perror("send error");
      connection();
    }
    else {
      printf("SEND DATA %s\n", data);
      memset(data, 0, 50);
      if(server_socket != -1){
        int recvFlag = recv(server_socket, data, 50, 0);
        if(recvFlag < 0){
          perror("recv error");
          connection();
          
        }
        printf("RECV DATA %s\n", data);
        
        char dest[20] = "python blue.py ";

        strcat(dest, strcmp(data,"GO") == 0 ? "1" : "0");

        printf("SEND COMMAND %s\n", dest);

        system(dest);
      }
    }

  }
  close(server_socket);
  return 0;
}
