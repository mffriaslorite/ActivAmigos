import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Group, GroupCreate, GroupUpdate, JoinLeaveResponse } from '../models/group.model';

@Injectable({
  providedIn: 'root'
})
export class GroupsService {
  private readonly API_BASE_URL = 'http://localhost:5000/api';
  private groupsSubject = new BehaviorSubject<Group[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  public groups$ = this.groupsSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get all groups
   */
  getGroups(): Observable<Group[]> {
    this.isLoadingSubject.next(true);

    return this.http.get<Group[]>(
      `${this.API_BASE_URL}/groups`,
      { withCredentials: true }
    ).pipe(
      tap(groups => {
        this.groupsSubject.next(groups);
        this.isLoadingSubject.next(false);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get a specific group by ID
   */
  getGroup(id: number): Observable<Group> {
    return this.http.get<Group>(
      `${this.API_BASE_URL}/groups/${id}`,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a new group
   */
  createGroup(groupData: GroupCreate): Observable<Group> {
    this.isLoadingSubject.next(true);

    return this.http.post<Group>(
      `${this.API_BASE_URL}/groups`,
      groupData,
      { withCredentials: true }
    ).pipe(
      tap(newGroup => {
        // Add the new group to the current groups list
        const currentGroups = this.groupsSubject.value;
        this.groupsSubject.next([newGroup, ...currentGroups]);
        this.isLoadingSubject.next(false);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update a group
   */
  updateGroup(id: number, groupData: GroupUpdate): Observable<Group> {
    return this.http.put<Group>(
      `${this.API_BASE_URL}/groups/${id}`,
      groupData,
      { withCredentials: true }
    ).pipe(
      tap(updatedGroup => {
        // Update the group in the current groups list
        const currentGroups = this.groupsSubject.value;
        const updatedGroups = currentGroups.map(group =>
          group.id === id ? updatedGroup : group
        );
        this.groupsSubject.next(updatedGroups);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete a group
   */
  deleteGroup(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_BASE_URL}/groups/${id}`,
      { withCredentials: true }
    ).pipe(
      tap(() => {
        // Remove the group from the current groups list
        const currentGroups = this.groupsSubject.value;
        const filteredGroups = currentGroups.filter(group => group.id !== id);
        this.groupsSubject.next(filteredGroups);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Join a group
   */
  joinGroup(id: number): Observable<JoinLeaveResponse> {
    return this.http.post<JoinLeaveResponse>(
      `${this.API_BASE_URL}/groups/${id}/join`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(response => {
        // Update the group's membership status in the current groups list
        this.updateGroupMembership(id, response.is_member, response.member_count);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Leave a group
   */
  leaveGroup(id: number): Observable<JoinLeaveResponse> {
    return this.http.post<JoinLeaveResponse>(
      `${this.API_BASE_URL}/groups/${id}/leave`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(response => {
        // Update the group's membership status in the current groups list
        this.updateGroupMembership(id, response.is_member, response.member_count);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update group membership status in the local state
   */
  private updateGroupMembership(groupId: number, isMember: boolean, memberCount: number): void {
    const currentGroups = this.groupsSubject.value;
    const updatedGroups = currentGroups.map(group =>
      group.id === groupId
        ? { ...group, is_member: isMember, member_count: memberCount }
        : group
    );
    this.groupsSubject.next(updatedGroups);
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    this.isLoadingSubject.next(false);

    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error('GroupsService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  };

  /**
   * Clear groups data (useful for logout)
   */
  clearGroups(): void {
    this.groupsSubject.next([]);
  }
}
