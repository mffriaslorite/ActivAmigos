import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface RuleTemplate {
  id: number;
  title: string;
  description: string;
  icon: string;
  rule_type: 'GROUP' | 'ACTIVITY' | 'BOTH';
  is_active: boolean;
  created_at: string;
}

export interface RuleTemplatesResponse {
  templates: RuleTemplate[];
}

export interface RulesResponse {
  group_id?: number;
  activity_id?: number;
  rules: RuleTemplate[];
}

@Injectable({
  providedIn: 'root'
})
export class RulesService {
  private readonly API_BASE_URL = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  /**
   * Get rule templates filtered by type
   */
  getRuleTemplates(type: 'GROUP' | 'ACTIVITY' | 'BOTH' = 'BOTH'): Observable<RuleTemplatesResponse> {
    const params = { type };
    
    return this.http.get<RuleTemplatesResponse>(`${this.API_BASE_URL}/rules/templates`, {
      params,
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Attach rules to a group
   */
  attachGroupRules(groupId: number, templateIds: number[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.API_BASE_URL}/rules/groups/${groupId}/rules`,
      { template_ids: templateIds },
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get rules for a group
   */
  getGroupRules(groupId: number): Observable<RulesResponse> {
    return this.http.get<RulesResponse>(
      `${this.API_BASE_URL}/rules/groups/${groupId}/rules`,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Attach rules to an activity
   */
  attachActivityRules(activityId: number, templateIds: number[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.API_BASE_URL}/rules/activities/${activityId}/rules`,
      { template_ids: templateIds },
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get rules for an activity
   */
  getActivityRules(activityId: number): Observable<RulesResponse> {
    return this.http.get<RulesResponse>(
      `${this.API_BASE_URL}/rules/activities/${activityId}/rules`,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get rules for a specific context (group or activity)
   */
  getContextRules(contextType: 'GROUP' | 'ACTIVITY', contextId: number): Observable<RulesResponse> {
    if (contextType === 'GROUP') {
      return this.getGroupRules(contextId);
    } else {
      return this.getActivityRules(contextId);
    }
  }

  /**
   * Attach rules to a specific context (group or activity)
   */
  attachContextRules(contextType: 'GROUP' | 'ACTIVITY', contextId: number, templateIds: number[]): Observable<{ message: string }> {
    if (contextType === 'GROUP') {
      return this.attachGroupRules(contextId, templateIds);
    } else {
      return this.attachActivityRules(contextId, templateIds);
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    console.error('Rules service error:', error);
    throw error;
  }
}