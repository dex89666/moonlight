from google.oauth2 import service_account
import google.auth.transport.requests

creds = service_account.Credentials.from_service_account_file(
    "root-habitat-474808-q1-cf1bd7498da1.json",
    scopes=["https://www.googleapis.com/auth/cloud-platform"]
)
creds.refresh(google.auth.transport.requests.Request())
print(creds.token)