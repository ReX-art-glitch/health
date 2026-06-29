from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import asyncio

class ConnectionManager:
    """WebSocket connection manager for real-time updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        self.active_connections[client_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            self.active_connections[client_id].remove(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)
    
    async def broadcast(self, message: dict, client_id: str = None):
        """Broadcast message to all or specific client"""
        if client_id:
            connections = self.active_connections.get(client_id, [])
        else:
            connections = [
                ws for conns in self.active_connections.values() 
                for ws in conns
            ]
        
        for connection in connections:
            try:
                await connection.send_json(message)
            except:
                pass
    
    async def broadcast_alert(self, alert_data: dict):
        """Broadcast alert to all connected clients"""
        await self.broadcast({
            "type": "alert",
            "data": alert_data,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def broadcast_dashboard_update(self, update_data: dict):
        """Broadcast dashboard updates"""
        await self.broadcast({
            "type": "dashboard_update",
            "data": update_data,
            "timestamp": datetime.utcnow().isoformat()
        })

manager = ConnectionManager()

# WebSocket endpoint
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages
            message = json.loads(data)
            
            if message.get("type") == "subscribe":
                # Subscribe to specific updates
                await manager.send_personal_message(
                    {"type": "subscribed", "channel": message.get("channel")},
                    websocket
                )
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)