from bluetooth import *

client_socket = BluetoothSocket( RFCOMM )

client_socket.connect(("98:D3:71:FD:BA:62", 1))

while True:
	msg = raw_input("Send : ")
	print msg
	client_socket.send(msg)

print "Finished"

client_socket.close()
