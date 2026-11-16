package com.friendapp.telecom

import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.PhoneAccountHandle
import android.telecom.DisconnectCause

class FriendAppConnectionService : ConnectionService() {

    override fun onCreateIncomingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        val connection = FriendAppConnection()
        connection.setInitializing()
        connection.connectionCapabilities = Connection.CAPABILITY_SUPPORT_HOLD or Connection.CAPABILITY_MUTE
        connection.audioModeIsVoip = true
        connection.setActive()
        return connection
    }

    override fun onCreateOutgoingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        val connection = FriendAppConnection()
        connection.setInitializing()
        connection.audioModeIsVoip = true
        connection.setDialing()
        return connection
    }
}

class FriendAppConnection : Connection() {
    override fun onAnswer() {
        setActive()
    }

    override fun onReject() {
        setDisconnected(DisconnectCause(DisconnectCause.REJECTED))
        destroy()
    }

    override fun onDisconnect() {
        setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
        destroy()
    }
}
