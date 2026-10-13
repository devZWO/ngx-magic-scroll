import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterLink, RouterOutlet, NgOptimizedImage],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
