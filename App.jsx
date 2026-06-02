import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Tu es un coach en investissement personnel francophone, expert, bienveillant et pédagogue. 
Tu t'appelles "Warren" et tu travailles pour une plateforme d'éducation financière indépendante.

Ton rôle : analyser le profil financier de l'utilisateur via une conversation naturelle, puis générer un plan d'investissement personnalisé.

DÉROULEMENT DE LA CONVERSATION :
1. Accueille chaleureusement, présente-toi brièvement
2. Pose des questions UNE PAR UNE (jamais plusieurs à la fois) pour collecter :
   - Âge
   - Situation professionnelle et revenus approximatifs
   - Charges fixes mensuelles
   - Épargne actuelle disponible
   - Objectifs financiers (retraite, achat immo, liberté financière...)
   - Horizon d'investissement
   - Tolérance au risque (explique-la simplement)
   - Enveloppes déjà ouvertes (PEA, assurance-vie, livrets...)
3. Une fois que tu as toutes les infos, génère un plan structuré avec :
   - Résumé du profil
   - Répartition recommandée (% par type d'actif)
   - ETF concrets à considérer (avec ISIN si pertinent)
   - Montant DCA mensuel suggéré
   - Priorité des enveloppes fiscales
   - 3 points de vigilance personnalisés

RÈGLES IMPORTANTES :
- Toujours préciser que tu n'es pas conseiller financier agréé et que c'est à titre éducatif
- Langage simple, évite le jargon sans l'expliquer
- Sois encourageant, surtout avec les débutants
- Si l'utilisateur mentionne Trade Republic ou un courtier spécifique, adapte tes recommandations
- Réponds TOUJOURS en français
- Garde un ton professionnel mais chaleureux, jamais froid`;

const TypingIndicator = () => (
  <div style={{ display: "flex", gap: 4, padding: "14px 18px", alignItems: "center" }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 7, height: 7, borderRadius: "50%", background: "#bbb",
        animation: "bounce 1.2s infinite",
        animationDelay: `${i * 0.2}s`,
      }} />
    ))}
  </div>
);

const Message = ({ msg }) => {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 16,
      gap: 10,
      alignItems: "flex-end",
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "#1a1a1a", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 600, flexShrink: 0,
          fontFamily: "'Cormorant Garamond', serif",
        }}>L</div>
      )}
      <div style={{
        maxWidth: "72%",
        background: isUser ? "#1a1a1a" : "#fff",
        color: isUser ? "#fff" : "#1a1a1a",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "12px 16px",
        fontSize: 14,
        lineHeight: 1.65,
        border: isUser ? "none" : "1px solid #e8e3d8",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        whiteSpace: "pre-wrap",
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "#e8e3d8", color: "#1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, flexShrink: 0,
        }}>👤</div>
      )}
    </div>
  );
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startConversation = async () => {
    setStarted(true);
    setLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: "Bonjour, je veux construire mon plan d'investissement." }],
        }),
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || "Bonjour ! Je suis Léo, votre coach en investissement. Commençons par faire connaissance — quel est votre âge ?";
      setMessages([
        { role: "user", content: "Bonjour, je veux construire mon plan d'investissement." },
        { role: "assistant", content: text },
      ]);
    } catch {
      setMessages([
        { role: "user", content: "Bonjour, je veux construire mon plan d'investissement." },
        { role: "assistant", content: "Bonjour ! Je suis Léo, votre coach en investissement personnel. Je suis là pour vous aider à construire un plan sur mesure.\n\nPour commencer, pourriez-vous me dire quel est votre âge ?" },
      ]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || "Je n'ai pas pu traiter votre message. Pouvez-vous reformuler ?";
      setMessages(prev => [...prev, { role: "assistant", content: text }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Une erreur s'est produite. Veuillez réessayer." }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reset = () => {
    setMessages([]);
    setStarted(false);
    setInput("");
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#faf9f5",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        textarea { resize: none; outline: none; border: none; background: transparent; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1a1a1a; width: 100%; }
        textarea::placeholder { color: #bbb; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #e8e3d8",
        padding: "16px 32px",
        background: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "#1a1a1a", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600,
          }}>L</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Léo · Coach Investissement</div>
            <div style={{ fontSize: 11, color: "#999", fontFamily: "'DM Mono', monospace" }}>
              {started ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1a6b3c", display: "inline-block" }} />
                  En ligne · Analyse de profil
                </span>
              ) : "Prêt à démarrer"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            fontSize: 11, color: "#999",
            background: "#f5f3ee", border: "1px solid #e8e3d8",
            borderRadius: 20, padding: "4px 12px",
            fontFamily: "'DM Mono', monospace",
          }}>
            À titre éducatif uniquement
          </div>
          {started && (
            <button onClick={reset} style={{
              fontSize: 12, color: "#999", background: "none",
              border: "1px solid #e8e3d8", borderRadius: 6,
              padding: "6px 12px", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Recommencer
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        {!started ? (
          /* Landing */
          <div style={{
            maxWidth: 560, margin: "60px auto 0", textAlign: "center",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "#1a1a1a", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600,
              margin: "0 auto 24px",
            }}>L</div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 32, fontWeight: 600,
              letterSpacing: "-0.01em", marginBottom: 12,
            }}>
              Votre coach en investissement<br />
              <em style={{ fontWeight: 400, color: "#888" }}>personnel et gratuit</em>
            </h2>
            <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, marginBottom: 32, maxWidth: 420, margin: "0 auto 32px" }}>
              Léo analyse votre situation, votre profil de risque et vos objectifs pour vous proposer un plan d'investissement sur mesure — en quelques minutes.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 40, flexWrap: "wrap" }}>
              {["Débutants bienvenus", "Plan personnalisé", "ETF concrets", "Fiscalité française"].map(tag => (
                <div key={tag} style={{
                  fontSize: 12, color: "#888",
                  background: "#fff", border: "1px solid #e8e3d8",
                  borderRadius: 20, padding: "5px 14px",
                }}>✓ {tag}</div>
              ))}
            </div>
            <button onClick={startConversation} style={{
              background: "#1a1a1a", color: "#fff",
              border: "none", borderRadius: 12,
              padding: "16px 40px", fontSize: 15, fontWeight: 500,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.01em",
              transition: "opacity 0.2s",
            }}
              onMouseOver={e => e.target.style.opacity = "0.85"}
              onMouseOut={e => e.target.style.opacity = "1"}
            >
              Démarrer l'analyse →
            </button>
            <div style={{ fontSize: 11, color: "#ccc", marginTop: 16, fontFamily: "'DM Mono', monospace" }}>
              Aucune donnée personnelle stockée
            </div>
          </div>
        ) : (
          /* Messages */
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {messages.map((msg, i) => (
              <Message key={i} msg={msg} />
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "#1a1a1a", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 600, flexShrink: 0,
                  fontFamily: "'Cormorant Garamond', serif",
                }}>L</div>
                <div style={{
                  background: "#fff", border: "1px solid #e8e3d8",
                  borderRadius: "18px 18px 18px 4px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}>
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {started && (
        <div style={{
          borderTop: "1px solid #e8e3d8",
          padding: "16px 32px",
          background: "#fff",
          flexShrink: 0,
        }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{
              display: "flex", gap: 12, alignItems: "flex-end",
              background: "#faf9f5", border: "1px solid #e8e3d8",
              borderRadius: 14, padding: "12px 16px",
            }}>
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Répondez à Léo..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
                style={{ maxHeight: 120, overflowY: "auto" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                style={{
                  background: input.trim() && !loading ? "#1a1a1a" : "#e8e3d8",
                  color: input.trim() && !loading ? "#fff" : "#bbb",
                  border: "none", borderRadius: 10,
                  width: 38, height: 38, flexShrink: 0,
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, transition: "all 0.2s",
                }}
              >
                ↑
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#ccc", textAlign: "center", marginTop: 8, fontFamily: "'DM Mono', monospace" }}>
              Entrée pour envoyer · Shift+Entrée pour aller à la ligne
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
