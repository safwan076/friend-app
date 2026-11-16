package com.friendapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.friendapp.data.models.Celebrity
import com.friendapp.data.models.LocationEvent
import com.friendapp.data.models.UserSelf

// 1. LOGIN SCREEN WITH STRICT PRIVACY GUARANTEE
@Composable
fun LoginScreen(
    onLoginSuccess: (UserSelf) -> Unit
) {
    var phone by remember { mutableStateOf("+1") }
    var otp by remember { mutableStateOf("123456") }
    var step by remember { mutableStateOf(1) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF090D16))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Security,
            contentDescription = null,
            tint = Color(0xFF6366F1),
            modifier = Modifier.size(56.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "Welcome to Friend App",
            color = Color.White,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Anonymous Calls & Hyper-Local Events",
            color = Color(0xFF94A3B8),
            fontSize = 12.sp
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Privacy Guarantee Card
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF064E3B).copy(alpha = 0.5f)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Privacy Protected: Your mobile number will NEVER be visible to callers, strangers, or celebrities.",
                    color = Color(0xFFA7F3D0),
                    fontSize = 11.sp,
                    lineHeight = 15.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        if (step == 1) {
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Mobile Number (E.164)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = { step = 2 },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
            ) {
                Text("Send Verification SMS")
            }
        } else {
            OutlinedTextField(
                value = otp,
                onValueChange = { otp = it },
                label = { Text("6-Digit Code (Default: 123456)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = {
                    onLoginSuccess(
                        UserSelf(
                            id = "mock-id-1234",
                            display_name = "Alex_Native",
                            role = "REGULAR_USER",
                            status = "ACTIVE",
                            created_at = ""
                        )
                    )
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
            ) {
                Text("Verify & Continue")
            }
        }
    }
}

// 2. RANDOM MATCHMAKING SCREEN (WEBRTC AUDIO/VIDEO)
@Composable
fun RandomMatchScreen() {
    var isVideo by remember { mutableStateOf(true) }
    var inCall by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF090D16))
    ) {
        if (!inCall) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(Color(0xFF6366F1).copy(alpha = 0.2f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isVideo) Icons.Default.Videocam else Icons.Default.Mic,
                        contentDescription = null,
                        tint = Color(0xFF818CF8),
                        modifier = Modifier.size(40.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Connect with Random People Online",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Instant 1-on-1 audio and video. Your phone number is 100% private.",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp
                )

                Spacer(modifier = Modifier.height(30.dp))

                Button(
                    onClick = { inCall = true },
                    modifier = Modifier.height(52.dp).fillMaxWidth(0.8f),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                ) {
                    Text("Start Random Call", fontWeight = FontWeight.Bold)
                }
            }
        } else {
            // In-call UI with Camera Canvas and Next button
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .background(Color(0xFF1E293B)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Live WebRTC Peer Stream Active", color = Color.White, fontSize = 14.sp)
                }

                Row(
                    modifier = Modifier
                        .padding(24.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    IconButton(onClick = { inCall = false }) {
                        Icon(Icons.Default.CallEnd, contentDescription = null, tint = Color.Red)
                    }
                    Button(onClick = { /* next match */ }) {
                        Icon(Icons.Default.FastForward, contentDescription = null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Next")
                    }
                    IconButton(onClick = { /* report */ }) {
                        Icon(Icons.Default.Flag, contentDescription = null, tint = Color.Yellow)
                    }
                }
            }
        }
    }
}
