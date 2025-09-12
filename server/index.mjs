import express from 'express';
import bodyParser from 'body-parser';
import webpush from 'web-push';
import cors from 'cors';

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

// 🔑 Clés VAPID (à mettre plus tard dans un .env)
const publicVapidKey = 'BHwjs1r_j0oxzPQGR0kTgW1YixQDNmuCKRHCCcwCv_F8DMYNPY8kNZOatdQlaFNQO_e_3VUVCyvQwAHu_zikjqc';
const privateVapidKey = 'gtBHqIyxYfgM5sps_n14GzrF0YAW0A6WnJLMuYsk5NQ';

webpush.setVapidDetails('mailto:test@example.com', publicVapidKey, privateVapidKey);

let subscriptions = [];

// ✅ Route de diagnostic
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    subscriptionsCount: subscriptions.length
  });
});

// ✅ Sauvegarde des abonnements
app.post('/api/save-subscription', (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({ message: 'Subscription saved' });
});

// ✅ Envoi de notifications
app.post('/api/send-notification', (req, res) => {
  const notificationPayload = {
    title: 'New Notification',
    body: 'This is a new notification'
  };

  const promises = subscriptions.map(subscription =>
    webpush.sendNotification(subscription, JSON.stringify(notificationPayload))
  );

  Promise.all(promises)
    .then(() => res.sendStatus(200))
    .catch(err => {
      console.error('Error sending notification, reason: ', err);
      res.sendStatus(500);
    });
});

// 🚀 Lancement serveur
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`✅ Backend API started on port ${port}`);
});
