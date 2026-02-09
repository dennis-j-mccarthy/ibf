// Analytics tracking for form funnel
// Tracks internally to database and optionally to external providers

type FunnelEvent =
  | 'form_step1_started'
  | 'form_step1_completed'
  | 'form_step2_started'
  | 'form_step2_completed'
  | 'appointment_shown'
  | 'appointment_scheduled';

interface EventProperties {
  orgType?: string;
  schoolType?: string;
  state?: string;
  rep?: string;
  [key: string]: string | number | boolean | undefined;
}

// Generate or retrieve session ID for tracking
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';

  let sessionId = sessionStorage.getItem('ibf_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('ibf_session_id', sessionId);
  }
  return sessionId;
}

export function trackFunnelEvent(event: FunnelEvent, properties?: EventProperties) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${event}`, properties || '');
  }

  // Track internally to database
  if (typeof window !== 'undefined') {
    const sessionId = getSessionId();
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, event, properties }),
    }).catch(err => console.error('Analytics tracking failed:', err));
  }

  // Google Analytics 4 (gtag) - optional
  if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', event, properties);
  }
}

// Helper to determine which rep was assigned
export function getRepName(appointmentUrl: string | null): string {
  if (!appointmentUrl) return 'none';
  if (appointmentUrl.includes('julie-degregoria')) return 'Julie DeGregoria';
  if (appointmentUrl.includes('jeanette-pohl')) return 'Jeanette Pohl';
  if (appointmentUrl.includes('alma-cue')) return 'Alma Cue';
  if (appointmentUrl.includes('marni')) return 'Marni'; // TODO: Update with actual URL pattern
  if (appointmentUrl.includes('kneumaier')) return 'Kim Neumaier';
  return 'unknown';
}
