export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function handleUnauthorizedError(toast: any) {
  toast({
    title: "Session Expired",
    description: "Please log in again to continue.",
    variant: "destructive",
  });
  setTimeout(() => {
    window.location.href = "/api/login";
  }, 1000);
}