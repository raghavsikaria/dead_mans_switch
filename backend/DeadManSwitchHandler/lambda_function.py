import json
import os
from decimal import Decimal
import boto3
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import auth, credentials

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

if not firebase_admin._apps:
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.environ['FIREBASE_PROJECT_ID'],
        "private_key_id": os.environ['FIREBASE_PRIVATE_KEY_ID'],
        "private_key": os.environ['FIREBASE_PRIVATE_KEY'].replace('\\\\n', '\n'),
        "client_email": os.environ['FIREBASE_CLIENT_EMAIL'],
        "client_id": os.environ['FIREBASE_CLIENT_ID'],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": os.environ['FIREBASE_CLIENT_X509_CERT_URL'],
        "universe_domain": "googleapis.com"
    })
    firebase_admin.initialize_app(cred)

def validate_token(headers):
    auth_header = headers.get('authorization', '')
    if not auth_header.startswith('Bearer '):
        raise Exception("Missing or malformed token")

    id_token = auth_header.split('Bearer ')[1]
    decoded_token = auth.verify_id_token(id_token)
    return decoded_token['uid']

def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    else:
        return obj

def lambda_handler(event, context):
    try:
        current_time = datetime.now(timezone.utc).isoformat()
        print("EVENT:", event)
        user_id = validate_token(event['headers'])
        body = json.loads(event['body'])
        assert body['user_id'] == user_id

        mode = body.get("mode", "save")

        if mode == "fetch":
            result = table.get_item(Key={'user_id': user_id})
            item = result.get('Item')
            clean_item = convert_decimals(item)
            if item:
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'threshold_hours': clean_item['threshold_hours'],
                        'contact_emails': clean_item['contact_emails'],
                        'last_checkin_time': clean_item['last_checkin_time']
                    }),
                    'headers': {
                        "Access-Control-Allow-Origin": "https://deadmans-switch-f8d02.web.app",
                        "Access-Control-Allow-Headers": "*"
                    }
                }
            else:
                return {
                    'statusCode': 204,
                    'body': json.dumps({'message': 'No config found'}),
                    'headers': {
                        "Access-Control-Allow-Origin": "https://deadmans-switch-f8d02.web.app",
                        "Access-Control-Allow-Headers": "*"
                    }
                }

        if mode == "delete":
            table.delete_item(Key={'user_id': user_id})
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'User data deleted'}),
                'headers': {
                    "Access-Control-Allow-Origin": "https://deadmans-switch-f8d02.web.app",
                    "Access-Control-Allow-Headers": "*"
                }
            }
        
        if mode == "checkin":
            existing = table.get_item(Key={'user_id': user_id})
            if 'Item' not in existing:
                print(f"No config found for user {user_id}, skipping check-in.")
                return {
                    'statusCode': 204,
                    'body': json.dumps({'message': 'No config found, no check-in performed'}),
                    'headers': {
                        "Access-Control-Allow-Origin": "https://deadmans-switch-f8d02.web.app",
                        "Access-Control-Allow-Headers": "*"
                    }
                }

            table.update_item(
                Key={'user_id': user_id},
                UpdateExpression="SET last_checkin_time = :t, disabled = :d",
                ExpressionAttributeValues={':t': current_time, ':d': False}
            )

            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Check-in updated'}),
                'headers': {
                    "Access-Control-Allow-Origin": "https://deadmans-switch-f8d02.web.app",
                    "Access-Control-Allow-Headers": "*"
                }
            }

        user_id = body['user_id']
        threshold_hours = int(body['threshold_hours'])
        contact_emails = body.get('contact_emails')

        table.put_item(
            Item={
                'user_id': user_id,
                'threshold_hours': threshold_hours,
                'contact_emails': contact_emails,
                'last_checkin_time': current_time,
                'register_timestamp': current_time,
                'disabled': False
            }
        )

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Settings saved.'}),
            'headers': {
                "Access-Control-Allow-Origin": "https://deadmans-switch-f8d02.web.app",
                "Access-Control-Allow-Headers": "*"
            }
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                "Access-Control-Allow-Origin": "https://deadmans-switch-f8d02.web.app",
                "Access-Control-Allow-Headers": "*"
            }
        }
