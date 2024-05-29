import 'dotenv/config';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { text } from 'input';

const { TELEGRAM_API_ID, TELEGRAM_API_HASH } = process.env;

const STRING_SESSION = new StringSession('');

(async () => {
  console.log('Loading interactive example...');
  const client = new TelegramClient(
    STRING_SESSION,
    Number(TELEGRAM_API_ID),
    TELEGRAM_API_HASH,
    {
      connectionRetries: 5,
    },
  );
  await client.start({
    phoneNumber: async () => await text('Please enter your number: '),
    password: async () => await text('Please enter your password: '),
    phoneCode: async () => await text('Please enter the code you received: '),
    onError: (err) => console.log(err),
  });
  console.log('You should now be connected.');
  console.log(client.session.save()); // Save this string to avoid logging in again
  await client.sendMessage('me', { message: 'Hello!' });
})();
