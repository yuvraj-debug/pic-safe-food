import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

/**
 * Initialize OAuth redirect handler
 * Call this on app startup to handle OAuth callbacks
 */
export async function handleOAuthRedirect(): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Check if we're returning from an OAuth redirect
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return { success: false, error: error.message };
    }

    if (session?.user) {
      return { success: true, user: session.user };
    }

    return { success: true };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Sign in with Google using redirect-based OAuth
 * Compatible with WebView/Median.co - uses full page redirect
 */
export async function loginWithGoogle(redirectUrl?: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl || window.location.origin,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        // Explicitly disable popup mode for WebView compatibility
        skipBrowserRedirect: false,
      },
    });

    return { error };
  } catch (err) {
    const error = err as Error;
    return { error };
  }
}

/**
 * Sign up with email and password
 * Shows verification message if email confirmation is required
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{
  success: boolean;
  error?: string;
  errorCode?: string;
  needsEmailConfirmation?: boolean
}> {
  try {
   console.log(`[signUpWithEmail] Attempting signup for: ${email}`);
   
   const { data, error } = await supabase.auth.signUp({
     email,
     password,
     options: {
       emailRedirectTo: window.location.origin,
     },
   });

   if (error) {
     // Log full error for debugging
     console.error('[signUpWithEmail] Error:', {
       message: error.message,
       code: error.code,
       status: error.status,
       email: email
     });
     
     // Provide more specific error messages based on Supabase error codes
     let userMessage = error.message;
     
     switch (error.code) {
       case 'user_already_exists':
         userMessage = 'An account with this email already exists. Please sign in instead or use a different email.';
         break;
       case 'invalid_email':
         userMessage = 'Please enter a valid email address.';
         break;
       case 'weak_password':
         userMessage = 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.';
         break;
       case 'over_request_rate_limit':
         userMessage = 'Too many signup attempts. Please wait a moment and try again.';
         break;
       default:
         userMessage = error.message || 'Signup failed. Please try again.';
     }
     
     return { success: false, error: userMessage, errorCode: error.code };
   }

    // Check if email confirmation is required
    // Supabase returns user with email_confirmed_at = null if confirmation needed
    const needsConfirmation = data.user && !data.user.email_confirmed_at;

    return {
      success: true,
      needsEmailConfirmation: needsConfirmation || false,
    };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Sign in with email and password
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err) {
    const error = err as Error;
    return { error };
  }
}

/**
 * Get the current session and user
 */
export async function getCurrentSession(): Promise<{ session: Session | null; user: User | null }> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Error getting session:", error);
      return { session: null, user: null };
    }

    return {
      session: data.session,
      user: data.session?.user ?? null,
    };
  } catch (err) {
    console.error("Error getting session:", err);
    return { session: null, user: null };
  }
}

/**
 * Reset password - sends reset email
 */
export async function resetPassword(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Update user password (after reset)
 */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}
