import boto3
import os
from datetime import datetime, timedelta, timezone

dynamodb = boto3.resource('dynamodb')
ses = boto3.client('ses')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

SENDER_EMAIL = os.environ['SENDER_EMAIL']

def lambda_handler(event, context):
    response = table.scan()
    now = datetime.now(timezone.utc)

    for user in response['Items']:
        user_id = user['user_id']
        threshold = int(user['threshold_hours'])
        contacts = user['contact_emails']
        last_checkin = datetime.fromisoformat(user['last_checkin_time'])

        if user.get("disabled", False):
            print(f"Skipping {user_id} — user is disabled")
            continue

        if now - last_checkin > timedelta(hours=threshold):
            print(f"User {user_id} has not checked in for more than {threshold} hours.")
            send_alert_email(contacts, user_id)
            table.update_item(
                Key={'user_id': user_id},
                UpdateExpression="SET disabled = :d",
                ExpressionAttributeValues={':d': True}
            )

    return {"statusCode": 200, "message": "Check complete"}

def send_alert_email(recipients, user_id):
    subject = f"🚨 Dead Man’s Switch Alert for User {user_id}"
    body = f"User {user_id} has not checked in. Please check on them."
    
    ses.send_email(
        Source=SENDER_EMAIL,
        Destination={'ToAddresses': recipients},
        Message={
            'Subject': {'Data': subject},
            'Body': {'Text': {'Data': body}}
        }
    )
