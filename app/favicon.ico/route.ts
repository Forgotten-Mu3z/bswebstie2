// Browsers ask for /favicon.ico on their own; answer with the 32px icon.
export function GET(request: Request) {
  return Response.redirect(new URL('/icon-32.png', request.url), 301);
}
