package com.friendapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.friendapp.data.models.UserSelf
import com.friendapp.ui.screens.LoginScreen
import com.friendapp.ui.screens.RandomMatchScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var currentUser by remember { mutableStateOf<UserSelf?>(null) }
            var selectedTab by remember { mutableStateOf(0) }

            MaterialTheme {
                if (currentUser == null) {
                    LoginScreen(onLoginSuccess = { currentUser = it })
                } else {
                    Scaffold(
                        bottomBar = {
                            NavigationBar(containerColor = Color(0xFF0F172A)) {
                                NavigationBarItem(
                                    selected = selectedTab == 0,
                                    onClick = { selectedTab = 0 },
                                    icon = { Icon(Icons.Default.Videocam, contentDescription = null) },
                                    label = { Text("Random") }
                                )
                                NavigationBarItem(
                                    selected = selectedTab == 1,
                                    onClick = { selectedTab = 1 },
                                    icon = { Icon(Icons.Default.Star, contentDescription = null) },
                                    label = { Text("Celebrities") }
                                )
                                NavigationBarItem(
                                    selected = selectedTab == 2,
                                    onClick = { selectedTab = 2 },
                                    icon = { Icon(Icons.Default.Place, contentDescription = null) },
                                    label = { Text("Events") }
                                )
                                NavigationBarItem(
                                    selected = selectedTab == 3,
                                    onClick = { selectedTab = 3 },
                                    icon = { Icon(Icons.Default.SupportAgent, contentDescription = null) },
                                    label = { Text("Support") }
                                )
                            }
                        }
                    ) { innerPadding ->
                        Surface(modifier = Modifier.padding(innerPadding)) {
                            when (selectedTab) {
                                0 -> RandomMatchScreen()
                                else -> RandomMatchScreen()
                            }
                        }
                    }
                }
            }
        }
    }
}
