import http.server
import socketserver
import os

os.chdir('/home/user/Doubao/chats/38441497042875650/chess_release_v1060_full/mt_deploy')

class COOPHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
        super().end_headers()

with socketserver.TCPServer(("", 8899), COOPHandler) as httpd:
    print("COOP/COEP server on 8899")
    httpd.serve_forever()
