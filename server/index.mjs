import express from 'express';
import bodyParser from 'body-parser';
import webpush from 'web-push';
import cors from 'cors';

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Autorise CORS pour toutes les routes

// 🔑 Clés VAPID (à externaliser plus tard dans un .env)
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

// ✅ Envoi de notifications personnalisées
app.post('/api/send-notification', (req, res) => {
  const { title, body, icon } = req.body;

  const notificationPayload = {
    title: title || 'Default Title',
    body: body || 'Default Body',
    icon: icon || 'https://planning.veec.coutellec.fr/logo.png' // ⚡ tu peux changer ce lien
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

// 🚀 Lancement serveur sur 4010 par défaut
const port = process.env.PORT || 4010;
app.listen(port, () => {
  console.log(`✅ Backend API started on port ${port}`);
});
