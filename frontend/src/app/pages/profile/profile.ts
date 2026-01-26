import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/authService';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { User } from '../../models/user';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatDividerModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class ProfilePage implements OnInit {
  user: User | null = null; 

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user; 
      console.log('Profile User Data:', this.user);
    });
  }

  getRoleName(roleId: number): string {
    const roles: { [key: number]: string } = {
      1: 'Administrator',
      2: 'Manager',
      3: 'Verified user',
      4: 'Standard user'
    };
    return roles[roleId] || 'User';
  }
}