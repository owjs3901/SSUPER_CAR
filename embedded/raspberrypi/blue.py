from bluetooth import *
import sys

client_socket = BluetoothSocket( RFCOMM )

client_socket.connect(("98:D3:71:FD:BA:62", 1))

client_socket.send(sys.argv[1])

client_socket.close()

print "finish"
