import os
import asyncio
import smtplib
import firebase_admin
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from firebase_admin import credentials, firestore
from google import genai
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from flask import Flask, request, jsonify
from datetime import datetime

# Get credentials from environment variables
TELEGRAM_TOKEN = os.environ['Telegram_token']
GEMINI_API_KEY = os.environ['Gemini_API_Key']
FARM_EMAIL = os.environ['FARM_EMAIL']
GMAIL_APP_PASSWORD = os.environ['GMAIL_APP_PASSWORD']
FIREBASE_CRED_FILE = 'homestead-helper-fdc23-firebase-adminsdk-fbsvc-d19e5c2759.json'

POWLS_EMAIL = 'powlsfeed@yahoo.com'

# Initialize Firebase
cred = credentials.Certificate(FIREBASE_CRED_FILE)
firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize Gemini
client = genai.Client(api_key=GEMINI_API_KEY)

print("✓ Firebase connected")
print("✓ Gemini connected")
print("✓ Bot initializing...")

# System prompt
SYSTEM_PROMPT = """You are a homestead management assistant helping a family manage their farm.

THE FARM: Birds (chickens, ducks, peafowl), meat birds, bees, greenhouse, garden, fruit/orchard, 
compost, livestock (sheep, goats), outbuildings (barn, shop, garage, furnace shed, potting shed, 
pasture run-in, garden run-in), farm stand, solar panels, rainwater collection, wells, septic, 
equipment (tractor, old zero-turn, new zero-turn, old mower, attachments). 

THE FAMILY: 
- Two co-farm managers who share responsibilities
- Abby (9 years old): Helps with simple tasks, motivated by rewards (TJ Maxx trips, sleepovers)

YOUR JOB:
- Track tasks with flexible urgency (next 2 days, this week, when weather improves, etc.)
- Log data (harvests, observations, animal health, equipment use)
- Ask clarifying questions to learn their patterns over time
- Be conversational, friendly, and direct - no excessive flattery or over-the-top enthusiasm
- When they say "need to do X", treat it as an implicit task
- Remember: you're building knowledge about their specific homestead over time

Keep responses concise and practical. Be helpful, not gushing."""


# ─── Helper functions ────────────────────────────────────────────────────────

def get_user_profile(user_id):
    profile_ref = db.collection('users').document(str(user_id))
    profile = profile_ref.get()
    if profile.exists:
        return profile.to_dict()
    return None

def save_user_profile(user_id, name, role):
    db.collection('users').document(str(user_id)).set({
        'name': name,
        'role': role,
        'created_at': firestore.SERVER_TIMESTAMP
    })


# ─── Feed order helpers ───────────────────────────────────────────────────────

FEED_TYPES = {
    'sheep_goat': 'Sheep/Lamb/Goat Finisher',
    'layer': 'Layer Mash',
    'pig': 'Pig Feed',
    'chick': 'Chick Feed'
}

def get_feed_state(user_id):
    doc = db.collection('feed_order_states').document(str(user_id)).get()
    if doc.exists:
        return doc.to_dict()
    return None

def set_feed_state(user_id, state_data):
    db.collection('feed_order_states').document(str(user_id)).set(state_data)

def clear_feed_state(user_id):
    db.collection('feed_order_states').document(str(user_id)).delete()

def parse_number(text):
    text = text.lower().strip()
    words = {'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
             'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
             'none': 0, 'no': 0}
    for word, num in words.items():
        if word in text:
            return num
    import re
    nums = re.findall(r'\d+', text)
    if nums:
        return int(nums[0])
    return None

def build_order_summary(state):
    lines = []
    for key, label in FEED_TYPES.items():
        qty = state.get(key, 0)
        if qty and qty > 0:
            lines.append(f"{qty} bag{'s' if qty != 1 else ''} of {label}")
    if not lines:
        return "nothing"
    return ", ".join(lines)

def send_feed_order_email(state, orderer_name):
    order_lines = []
    for key, label in FEED_TYPES.items():
        qty = state.get(key, 0)
        if qty and qty > 0:
            order_lines.append(f"{qty} bag{'s' if qty != 1 else ''} of the {label}")

    order_text = " and ".join(order_lines)

    body = f"""For this Friday, we would like to order {order_text}.

Thanks,
{orderer_name}

The Farm at Otter Creek"""

    msg = MIMEMultipart()
    msg['From'] = FARM_EMAIL
    msg['To'] = POWLS_EMAIL
    msg['Subject'] = 'Order'
    msg.attach(MIMEText(body, 'plain'))

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(FARM_EMAIL, GMAIL_APP_PASSWORD)
        server.sendmail(FARM_EMAIL, POWLS_EMAIL, msg.as_string())

    db.collection('feed_orders').add({
        'ordered_by': orderer_name,
        'order': state,
        'order_summary': order_text,
        'status': 'sent',
        'ordered_at': firestore.SERVER_TIMESTAMP,
        'confirmation_received': False
    })

    print(f"✅ Feed order email sent for {orderer_name}")


# ─── Feed order conversation ───────────────────────────────────────────────────

def handle_feed_order(user_id, user_name, message):
    text = message.lower().strip()

    if any(phrase in text for phrase in ['order feed', 'order more feed', 'feed order']):
        set_feed_state(user_id, {'step': 'ask_sheep_goat'})
        return "Sure! Let's put together a feed order for Powl's.\n\nHow many bags of Sheep/Goat feed do you need? (Enter 0 if none)"

    state = get_feed_state(user_id)
    if not state:
        return None

    step = state.get('step')

    if any(word in text for word in ['cancel', 'stop', 'never mind', 'forget it']):
        clear_feed_state(user_id)
        return "Feed order cancelled. No email was sent."

    if step == 'ask_sheep_goat':
        qty = parse_number(message)
        if qty is None:
            return "Sorry, I didn't catch that. How many bags of Sheep/Goat feed? (say a number, or 0 for none)"
        state['sheep_goat'] = qty
        state['step'] = 'ask_layer'
        set_feed_state(user_id, state)
        return "Got it. How many bags of Layer Mash?"

    elif step == 'ask_layer':
        qty = parse_number(message)
        if qty is None:
            return "How many bags of Layer Mash? (say a number, or 0 for none)"
        state['layer'] = qty
        state['step'] = 'ask_pig'
        set_feed_state(user_id, state)
        return "Do you need any Pig Feed? If yes, how many bags? (say 0 or 'no' if not)"

    elif step == 'ask_pig':
        qty = parse_number(message)
        if qty is None:
            return "How many bags of Pig Feed? (say a number, or 0 for none)"
        state['pig'] = qty
        state['step'] = 'ask_chick'
        set_feed_state(user_id, state)
        return "Any Chick Feed? How many bags? (say 0 or 'no' if not)"

    elif step == 'ask_chick':
        qty = parse_number(message)
        if qty is None:
            return "How many bags of Chick Feed? (say a number, or 0 for none)"
        state['chick'] = qty
        state['step'] = 'confirm'
        set_feed_state(user_id, state)
        summary = build_order_summary(state)
        return (f"Here's your order for this Friday:\n\n📦 {summary}\n\n"
                f"Shall I send this to Powl's Feed? Reply yes to confirm or cancel to abort.")

    elif step == 'confirm':
        if any(word in text for word in ['yes', 'yeah', 'yep', 'send it', 'go ahead', 'confirm', 'do it']):
            try:
                send_feed_order_email(state, user_name)
                clear_feed_state(user_id)
                return ("✅ Order sent to Powl's Feed! I'll let you know when their confirmation comes in. "
                        "Remember, orders need to be in by Wednesday evening for Friday delivery.")
            except Exception as e:
                print(f"❌ Email error: {e}")
                clear_feed_state(user_id)
                return "❌ Something went wrong sending the email. Please try again or email Powl's directly."
        else:
            clear_feed_state(user_id)
            return "Feed order cancelled. No email was sent."

    return None


# ─── Telegram handlers ────────────────────────────────────────────────────────

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    message_text = update.message.text

    print(f"📨 Telegram from {update.effective_user.first_name}: {message_text}")

    profile = get_user_profile(user_id)

    if not profile:
        if not message_text.lower().startswith(("i'm", "i am", "this is", "my name is")):
            await update.message.reply_text(
                "Hey there! I'm your Homestead Helper. Before we start, who am I talking to? "
                "Just tell me your name (like 'I'm Mike' or 'This is Abby')"
            )
            return
        else:
            name = message_text.lower().replace("i'm", "").replace("i am", "").replace("this is", "").replace("my name is", "").strip()
            name = name.capitalize()
            role = "kid" if name.lower() == "abby" else "parent"
            save_user_profile(user_id, name, role)

            if role == "kid":
                await update.message.reply_text(
                    f"Hi {name}! Great to meet you. I'm here to help you keep track of your farm chores "
                    f"and celebrate when you do awesome work! Ready to get started?"
                )
            else:
                await update.message.reply_text(
                    f"Hey {name}! Good to meet you. I'm here to help manage the homestead. "
                    f"Tell me what's happening on the farm and I'll start building our system together."
                )
            return

    user_name = profile['name']
    user_role = profile['role']

    feed_reply = handle_feed_order(user_id, user_name, message_text)
    if feed_reply:
        await update.message.reply_text(feed_reply)
        return

    db.collection('conversations').add({
        'user_id': user_id,
        'user_name': user_name,
        'message': message_text,
        'timestamp': firestore.SERVER_TIMESTAMP,
        'type': 'user'
    })

    try:
        recent_messages = db.collection('conversations')\
            .where('user_id', '==', user_id)\
            .order_by('timestamp', direction=firestore.Query.DESCENDING)\
            .limit(20)\
            .stream()

        history = []
        for msg in recent_messages:
            data = msg.to_dict()
            history.append(f"{data['type']}: {data['message']}")
        history.reverse()

        user_context = f"\n\nYou are talking to {user_name}."
        if user_role == "kid":
            user_context += " Remember: she's 9 years old. Be encouraging and celebrate her efforts. Keep language simple and fun."

        full_prompt = f"{SYSTEM_PROMPT}{user_context}\n\nRecent conversation:\n" + "\n".join(history[-10:]) + f"\n\nUser: {message_text}\n\nAssistant:"

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_prompt
        )
        bot_reply = response.text

        db.collection('conversations').add({
            'user_id': user_id,
            'user_name': user_name,
            'message': bot_reply,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'type': 'assistant'
        })

        await update.message.reply_text(bot_reply)
        print(f"✅ Sent reply to {user_name}")

    except Exception as e:
        print(f"❌ Error: {e}")
        await update.message.reply_text("Oops, something went wrong. Can you try again?")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    profile = get_user_profile(user_id)

    if not profile:
        await update.message.reply_text(
            "Hey! I'm your Homestead Helper. Who am I talking to? "
            "Just tell me your name (like 'I'm Mike' or 'This is Abby')"
        )
    else:
        name = profile['name']
        role = profile['role']
        if role == "kid":
            await update.message.reply_text(f"Hey {name}! Ready to help out today? 🌟")
        else:
            await update.message.reply_text(f"Hey {name}! What's happening on the farm today?")


# ─── Flask API ────────────────────────────────────────────────────────────────

app = Flask(__name__)

USER_MAP = {'katie': 'siri_katie', 'mike': 'siri_mike', 'abby': 'siri_abby'}


@app.route('/telegram', methods=['POST'])
def telegram_webhook():
    try:
        update_data = request.json
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def process():
            bot_app = Application.builder().token(TELEGRAM_TOKEN).build()
            bot_app.add_handler(CommandHandler("start", start))
            bot_app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
            async with bot_app:
                update = Update.de_json(update_data, bot_app.bot)
                await bot_app.process_update(update)

        loop.run_until_complete(process())
        loop.close()
        return jsonify({'status': 'ok'})
    except Exception as e:
        print(f"❌ Telegram webhook error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/siri', methods=['POST'])
def siri_endpoint():
    try:
        data = request.json
        user_name = data.get('user', 'katie').lower()
        message = data.get('message', '')

        if not message:
            return jsonify({'error': 'No message provided'}), 400

        user_id = USER_MAP.get(user_name, 'siri_katie')
        print(f"📱 Siri from {user_name}: {message}")

        profile = get_user_profile(user_id)

        if not profile:
            role = "kid" if user_name == "abby" else "parent"
            save_user_profile(user_id, user_name.capitalize(), role)
            profile = {'name': user_name.capitalize(), 'role': role}

        feed_reply = handle_feed_order(user_id, profile['name'], message)
        if feed_reply:
            return jsonify({'response': feed_reply, 'user': profile['name']})

        db.collection('conversations').add({
            'user_id': user_id,
            'user_name': profile['name'],
            'message': message,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'type': 'user'
        })

        recent_messages = db.collection('conversations')\
            .where('user_id', '==', user_id)\
            .order_by('timestamp', direction=firestore.Query.DESCENDING)\
            .limit(20)\
            .stream()

        history = []
        for msg in recent_messages:
            msg_data = msg.to_dict()
            history.append(f"{msg_data['type']}: {msg_data['message']}")
        history.reverse()

        user_context = f"\n\nYou are talking to {profile['name']}."
        if profile['role'] == "kid":
            user_context += " Remember: she's 9 years old. Be encouraging and celebrate her efforts. Keep language simple and fun."

        full_prompt = f"{SYSTEM_PROMPT}{user_context}\n\nRecent conversation:\n" + "\n".join(history[-10:]) + f"\n\nUser: {message}\n\nAssistant:"

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_prompt
        )
        bot_reply = response.text

        db.collection('conversations').add({
            'user_id': user_id,
            'user_name': profile['name'],
            'message': bot_reply,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'type': 'assistant'
        })

        print(f"✅ Siri response to {user_name}")
        return jsonify({'response': bot_reply, 'user': profile['name']})

    except Exception as e:
        print(f"❌ Siri error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/feed-confirmation', methods=['POST'])
def feed_confirmation():
    try:
        data = request.json
        subject = data.get('subject', '')
        sender = data.get('sender', '')
        body = data.get('body', '')[:500]

        print(f"📧 Powl's confirmation received: {subject}")

        orders = db.collection('feed_orders')\
            .where('confirmation_received', '==', False)\
            .order_by('ordered_at', direction=firestore.Query.DESCENDING)\
            .limit(1)\
            .stream()

        for order in orders:
            order.reference.update({
                'confirmation_received': True,
                'confirmation_subject': subject,
                'confirmation_body': body,
                'confirmed_at': firestore.SERVER_TIMESTAMP
            })

        db.collection('feed_confirmations').add({
            'sender': sender,
            'subject': subject,
            'body': body,
            'received_at': firestore.SERVER_TIMESTAMP
        })

        return jsonify({'status': 'ok', 'message': 'Confirmation logged'})

    except Exception as e:
        print(f"❌ Feed confirmation error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'services': ['telegram', 'siri', 'feed-ordering']})


@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'service': 'Homestead Helper API',
        'status': 'running',
        'endpoints': {
            '/health': 'Health check',
            '/siri': 'Siri Shortcuts endpoint (POST)',
            '/telegram': 'Telegram webhook (POST)',
            '/feed-confirmation': 'Powls confirmation webhook (POST)'
        }
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print("🌐 Starting Flask web server...")
    print("🤖 Telegram running in webhook mode")
    app.run(host='0.0.0.0', port=port, threaded=True)
