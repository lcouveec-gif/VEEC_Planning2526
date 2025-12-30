import React, { useState, useEffect, useRef } from 'react';
import {
  AI_FUNCTIONS,
  executeAIFunction,
  getFunctionDefinitionsForOpenAI,
  getFunctionDefinitionsForAnthropic,
  getFunctionDefinitionsForGemini,
} from '../lib/aiFunctions';
import { supabase } from '../lib/supabaseClient';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'function';
  content: string;
  timestamp: Date;
  functionCall?: { name: string; args: any };
}

interface LLMSettings {
  provider: string;
  apiKey: string;
  model: string;
  endpoint: string;
  temperature: number;
  maxTokens: number;
}

// Fonction pour générer le prompt système avec la date/heure actuelle
const getSystemPrompt = () => {
  const now = new Date();
  const dateFr = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const heure = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const jourSemaine = now.toLocaleDateString('fr-FR', { weekday: 'long' });

  return `Tu es un assistant IA spécialisé dans la gestion de planning sportif pour le club VEEC (FS VAL D'EUROPE ESBLY COUPVRAY VOLLEYBALL).

CONTEXTE TEMPOREL ACTUEL:
- Date et heure: ${dateFr} à ${heure}
- Jour de la semaine: ${jourSemaine}
- Date ISO: ${now.toISOString().split('T')[0]}

NOMENCLATURE DES ÉQUIPES:
Les équipes VEEC sont identifiées par des codes courts (SM1, SM2, SF1, U18M, U15F, etc.) ou noms complets.
Exemples: "SM1" = Seniors Masculins 1, "SF1" = Seniors Féminines 1, "U18M" = U18 Masculins

Tu as accès à des fonctions pour récupérer des données en temps réel :
- getCurrentDateTime : pour obtenir la date/heure actuelle si tu en as besoin
- calculateDate : pour calculer des dates relatives (demain, hier, semaine prochaine, etc.)
- getTrainingSessions : pour obtenir les entraînements (par équipe, jour, gymnase)
- getMatches : pour obtenir les matchs d'UNE ÉQUIPE VEEC (utilise le code court comme "SM1" ou le nom complet)
- getTeams : pour obtenir la liste de toutes les équipes du club avec leurs infos
- getPlayers : pour obtenir les joueurs d'une équipe
- getStatistics : pour obtenir des statistiques générales

INSTRUCTIONS IMPORTANTES:
- Quand l'utilisateur mentionne une équipe (SM1, SM4, U18M, etc.), utilise EXACTEMENT ce code dans les fonctions
- Pour "prochain match", utilise calculateDate pour obtenir la date du jour, puis getMatches avec startDate = aujourd'hui
- Pour les matchs futurs, utilise startDate = date du jour (pas de endDate pour voir tous les matchs à venir)
- Pour les entraînements, filtre par jour de la semaine (lundi, mardi, etc.)
- Réponds de manière claire, concise et en français
- Si l'utilisateur demande les joueurs d'une équipe, utilise getPlayers avec le paramètre team`;
};

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmSettings, setLlmSettings] = useState<LLMSettings | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialiser la reconnaissance vocale
  useEffect(() => {
    // Vérifier si le navigateur supporte la reconnaissance vocale
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      console.warn('La reconnaissance vocale n\'est pas supportée par ce navigateur');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Erreur de reconnaissance vocale:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Veuillez autoriser l\'accès au microphone dans les paramètres de votre navigateur.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Charger la configuration LLM depuis Supabase au montage
  useEffect(() => {
    const loadLLMSettings = async () => {
      try {
        // Récupérer la session actuelle
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!currentSession) {
          console.log('No session, LLM settings not loaded');
          return;
        }

        // Appel à l'Edge Function pour récupérer les paramètres
        const response = await fetch(
          'https://odfijihyepuxjzeueiri.supabase.co/functions/v1/get-llm-settings',
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${currentSession.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();

        if (response.ok && data.settings) {
          // Récupérer la clé API déchiffrée pour cette session
          const apiKeyResponse = await fetch(
            'https://odfijihyepuxjzeueiri.supabase.co/functions/v1/get-llm-api-key',
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${currentSession.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          const apiKeyData = await apiKeyResponse.json();

          if (!apiKeyResponse.ok || !apiKeyData.apiKey) {
            console.error('Failed to load API key:', apiKeyData);
            return;
          }

          // Stocker les paramètres avec la clé API en mémoire (pas dans localStorage)
          setLlmSettings({
            provider: data.settings.provider,
            apiKey: apiKeyData.apiKey, // Clé API récupérée de manière sécurisée
            model: data.settings.model,
            endpoint: data.settings.endpoint,
            temperature: data.settings.temperature,
            maxTokens: data.settings.maxTokens,
          });

          // Message de bienvenue avec date actuelle
          const now = new Date();
          const dateFr = now.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          setMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: `Bonjour ! Je suis votre assistant IA pour la gestion du planning VEEC.

📆 Nous sommes le ${dateFr}

Je peux vous aider à :
📅 Consulter les entraînements et matchs (aujourd'hui, demain, cette semaine...)
👥 Rechercher des équipes et joueurs
📊 Obtenir des statistiques du club
❓ Répondre à vos questions sur l'organisation
🎤 Vous pouvez aussi me parler avec le microphone !

Que souhaitez-vous savoir ?`,
            timestamp: new Date(),
          }]);
        } else {
          console.log('No LLM settings found in Supabase');
        }
      } catch (error) {
        console.error('Error loading LLM settings:', error);
      }
    };

    loadLLMSettings();
  }, []);

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ajuster la hauteur du textarea automatiquement
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputMessage]);

  const callLLMWithFunctions = async (conversationHistory: any[]): Promise<string> => {
    if (!llmSettings) {
      throw new Error('Configuration LLM non trouvée');
    }

    // Récupérer la session actuelle
    const { data: { session: currentSession } } = await supabase.auth.getSession();

    if (!currentSession) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }

    let iterations = 0;
    const maxIterations = 5; // Limite pour éviter les boucles infinies

    while (iterations < maxIterations) {
      iterations++;

      try {
        // Déclarer les variables pour l'appel LLM
        let url = llmSettings.endpoint;
        let headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        let body: any = {};

        // Configuration spécifique selon le provider
        if (llmSettings.provider === 'google') {
          // Google Gemini API
          url = `https://generativelanguage.googleapis.com/v1beta/models/${llmSettings.model}:generateContent?key=${llmSettings.apiKey}`;

          // Convertir l'historique au format Gemini
          const geminiHistory = conversationHistory.map((msg, index) => {
            if (msg.role === 'function') {
              return {
                role: 'user',
                parts: [{ text: `Résultat de ${msg.functionName}: ${msg.content}` }],
              };
            }
            // Injecter le prompt système dans le premier message utilisateur
            if (index === 0 && msg.role === 'user') {
              return {
                role: 'user',
                parts: [{ text: `${getSystemPrompt()}\n\nQuestion de l'utilisateur: ${msg.content}` }],
              };
            }
            return {
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }],
            };
          });

          const tools = getFunctionDefinitionsForGemini();

          body = {
            contents: geminiHistory,
            tools: tools.length > 0 ? [{ function_declarations: tools }] : undefined,
            generationConfig: {
              temperature: llmSettings.temperature,
              maxOutputTokens: llmSettings.maxTokens,
            },
          };
        } else if (llmSettings.provider === 'anthropic') {
          // Anthropic Claude API
          headers = {
            'Content-Type': 'application/json',
            'x-api-key': llmSettings.apiKey,
            'anthropic-version': '2023-06-01',
          };

          const anthropicMessages = conversationHistory
            .filter(msg => msg.role !== 'system')
            .map(msg => {
              if (msg.role === 'function') {
                return {
                  role: 'user',
                  content: `Résultat de la fonction ${msg.functionName}: ${msg.content}`,
                };
              }
              return {
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content,
              };
            });

          const tools = getFunctionDefinitionsForAnthropic();

          body = {
            model: llmSettings.model,
            max_tokens: llmSettings.maxTokens,
            temperature: llmSettings.temperature,
            system: getSystemPrompt(),
            messages: anthropicMessages,
            tools: tools.length > 0 ? tools : undefined,
          };
        } else {
          // OpenAI et custom
          headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${llmSettings.apiKey}`,
          };

          const openaiMessages = [
            { role: 'system', content: getSystemPrompt() },
            ...conversationHistory.map(msg => {
              if (msg.role === 'function') {
                return {
                  role: 'function',
                  name: msg.functionName,
                  content: msg.content,
                };
              }
              return {
                role: msg.role,
                content: msg.content,
              };
            }),
          ];

          const tools = getFunctionDefinitionsForOpenAI();

          body = {
            model: llmSettings.model,
            messages: openaiMessages,
            temperature: llmSettings.temperature,
            max_tokens: llmSettings.maxTokens,
            functions: tools.length > 0 ? tools : undefined,
            function_call: tools.length > 0 ? 'auto' : undefined,
          };
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || error.message || `Erreur ${response.status}`);
        }

        const data = await response.json();

        // Traiter la réponse selon le provider
        if (llmSettings.provider === 'google') {
          const candidate = data.candidates?.[0];
          const content = candidate?.content;

          // Vérifier si c'est un appel de fonction
          const functionCall = content?.parts?.find((part: any) => part.functionCall);
          if (functionCall) {
            const funcName = functionCall.functionCall.name;
            const funcArgs = functionCall.functionCall.args || {};

            console.log('Function call detected (Gemini):', funcName, funcArgs);

            // Exécuter la fonction
            const result = await executeAIFunction(funcName, funcArgs);

            // Ajouter le résultat à l'historique
            conversationHistory.push({
              role: 'function',
              functionName: funcName,
              content: JSON.stringify(result, null, 2),
            });

            // Continuer la boucle pour obtenir la réponse finale
            continue;
          }

          // Sinon, retourner le texte
          return content?.parts?.[0]?.text || 'Pas de réponse';
        } else if (llmSettings.provider === 'anthropic') {
          const content = data.content;

          // Vérifier si c'est un appel de fonction (tool_use)
          const toolUse = content?.find((block: any) => block.type === 'tool_use');
          if (toolUse) {
            const funcName = toolUse.name;
            const funcArgs = toolUse.input || {};

            console.log('Tool use detected (Anthropic):', funcName, funcArgs);

            // Exécuter la fonction
            const result = await executeAIFunction(funcName, funcArgs);

            // Ajouter le résultat à l'historique
            conversationHistory.push({
              role: 'function',
              functionName: funcName,
              content: JSON.stringify(result, null, 2),
            });

            // Continuer la boucle
            continue;
          }

          // Sinon, retourner le texte
          const textBlock = content?.find((block: any) => block.type === 'text');
          return textBlock?.text || 'Pas de réponse';
        } else {
          // OpenAI
          const choice = data.choices?.[0];
          const message = choice?.message;

          // Vérifier si c'est un appel de fonction
          if (message?.function_call) {
            const funcName = message.function_call.name;
            const funcArgs = JSON.parse(message.function_call.arguments || '{}');

            console.log('Function call detected (OpenAI):', funcName, funcArgs);

            // Exécuter la fonction
            const result = await executeAIFunction(funcName, funcArgs);

            // Ajouter le résultat à l'historique
            conversationHistory.push({
              role: 'function',
              functionName: funcName,
              content: JSON.stringify(result, null, 2),
            });

            // Continuer la boucle
            continue;
          }

          // Sinon, retourner le contenu
          return message?.content || 'Pas de réponse';
        }
      } catch (error) {
        console.error('Erreur lors de l\'appel LLM:', error);
        throw error;
      }
    }

    // Si on atteint la limite d'itérations
    return 'Désolé, j\'ai atteint la limite de traitement. Pouvez-vous reformuler votre question ?';
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!llmSettings) {
      alert('Veuillez configurer le LLM dans Admin > IA/Automatisation');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Préparer l'historique de conversation
      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : msg.role === 'function' ? 'function' : 'user',
        content: msg.content,
        functionName: msg.functionCall?.name,
      }));

      conversationHistory.push({
        role: 'user',
        content: userMessage.content,
      });

      // Appeler le LLM avec support des fonctions
      const assistantResponse = await callLLMWithFunctions(conversationHistory);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Erreur lors de la communication avec le LLM: ${error instanceof Error ? error.message : 'Erreur inconnue'}. Vérifiez votre configuration dans Admin > IA/Automatisation.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceInput = () => {
    if (!speechSupported) {
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur. Veuillez utiliser Chrome, Edge ou Safari.');
      return;
    }

    if (isListening) {
      // Arrêter l'écoute
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      // Démarrer l'écoute
      try {
        recognitionRef.current?.start();
      } catch (error) {
        console.error('Erreur lors du démarrage de la reconnaissance vocale:', error);
        setIsListening(false);
      }
    }
  };

  const handleClearConversation = () => {
    if (window.confirm('Voulez-vous vraiment effacer toute la conversation ?')) {
      const now = new Date();
      const dateFr = now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: `Conversation réinitialisée.

📆 Nous sommes le ${dateFr}

Comment puis-je vous aider ?`,
        timestamp: new Date(),
      }]);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!llmSettings) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold mb-4">Configuration requise</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Pour utiliser l'assistant IA, vous devez d'abord configurer l'accès au LLM dans votre profil utilisateur.
          </p>
          <a
            href="#admin"
            onClick={() => window.location.hash = '#admin'}
            className="inline-block px-6 py-3 bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary rounded-lg hover:opacity-90 transition-opacity font-semibold"
          >
            Aller dans Admin → IA/Automatisation
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-light-background dark:bg-dark-background">
      {/* Header du chat */}
      <div className="bg-light-surface dark:bg-dark-surface shadow-md p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xl">🤖</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Assistant IA VEEC</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {llmSettings.model} • {AI_FUNCTIONS.length} fonctions • Contexte temporel actif
              </p>
            </div>
          </div>
          <button
            onClick={handleClearConversation}
            className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            🗑️ Effacer
          </button>
        </div>
      </div>

      {/* Zone de messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-4xl space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary'
                    : 'bg-light-surface dark:bg-dark-surface border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                <div
                  className={`text-xs mt-2 ${
                    msg.role === 'user'
                      ? 'text-light-onPrimary/70 dark:text-dark-onPrimary/70'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-light-surface dark:bg-dark-surface border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-500">L'assistant réfléchit...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Zone de saisie */}
      <div className="bg-light-surface dark:bg-dark-surface border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex gap-2 items-end">
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 p-3">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question... (Shift+Entrée pour nouvelle ligne)"
                disabled={isLoading || isListening}
                rows={1}
                className="w-full bg-transparent resize-none outline-none max-h-32 disabled:opacity-50"
              />
            </div>
            {speechSupported && (
              <button
                onClick={handleVoiceInput}
                disabled={isLoading}
                className={`px-4 py-3 rounded-2xl font-semibold transition-all ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isListening ? 'Arrêter l\'écoute' : 'Activer la reconnaissance vocale'}
              >
                {isListening ? '🎤🔴' : '🎤'}
              </button>
            )}
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || isListening}
              className="px-6 py-3 bg-light-primary dark:bg-dark-primary text-light-onPrimary dark:text-dark-onPrimary rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            {isListening ? (
              <span className="text-red-500 font-semibold animate-pulse">
                🎤 Écoute en cours... Parlez maintenant !
              </span>
            ) : (
              <>Entrée pour envoyer • Shift+Entrée pour nouvelle ligne{speechSupported && ' • 🎤 pour parler'}</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
