import { Injectable, signal } from '@angular/core';
import { AuthChangeEvent, Session, createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly client = createClient(environment.supabaseUrl, environment.supabasePublishableKey);
  readonly session = signal<Session | null>(null);
  readonly ready = signal(false);

  constructor() {
    this.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.ready.set(true);
    });
    this.client.auth.onAuthStateChange((_event: AuthChangeEvent, session) => this.session.set(session));
  }

  async signUp(fullName: string, email: string, password: string): Promise<string | null> {
    const { error } = await this.client.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin } });
    return error?.message ?? null;
  }

  async signIn(email: string, password: string): Promise<string | null> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async resendConfirmation(email: string): Promise<string | null> {
    const { error } = await this.client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } });
    return error?.message ?? null;
  }

  async signOut(): Promise<void> { await this.client.auth.signOut(); }
}
