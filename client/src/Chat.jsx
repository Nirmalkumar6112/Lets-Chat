import { useContext, useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";

export default function Chat(){
    const [ws,setWs] = useState(null);
    const [onlinePeople,setOnlinePeople] = useState({});
    const [offlinePeople,setOfflinePeople] = useState({});
    const [selectedUserId,setSelectedUserId] = useState(null);
    const {username,id,setId,setUsername} = useContext(UserContext);
    const [newMessageText,setNewMessageText] = useState('');
    const [messages,setMessages] = useState([]);
    const divUnderMsgs = useRef();

    useEffect(() => {
        connectToWs();
    }, []);

    function connectToWs(){
        const ws = new WebSocket('ws://localhost:4000');
        setWs(ws);
        ws.addEventListener('message',handleMessage);
        ws.addEventListener('close', () => {
            setTimeout(() => {
                console.log('Disconnected. Trying to Reconnect...');
                connectToWs();
            },1000);
        });
    }

    function showOnlinePeople(peopleArr){
        const people = {};
        peopleArr.forEach(({userId,username}) => {
            people[userId] = username;
        });
        setOnlinePeople(people);
    }

    function handleMessage(ev){
        const messageData = JSON.parse(ev.data);
        //console.log({ev,messageData});
        if('online' in messageData){
            showOnlinePeople(messageData.online);
        }
        else if('text' in messageData){
            if(messageData.sender === selectedUserId){
                setMessages(prev => ([...prev,{...messageData}]));   
            }
        }
    }

    function sendMessage(ev,file = null){
        if(ev)
            ev.preventDefault();
        ws.send(JSON.stringify({
            recipient: selectedUserId,
            text: newMessageText,
            file,        
        }));
        
        setNewMessageText('');
        setMessages(prev => ([...prev,{
            text: newMessageText, 
            sender: id,
            recipient: selectedUserId,
            _id: Date.now(),
        }]));

        if(file){
            axios.get('/message/' + selectedUserId).then(res => {
                setMessages(res.data);
            });
        }
    }

    function logout(){
        axios.post('/logout').then(() => {
            setId(null);
            setUsername(null);
            setWs(null);
        });
    }

    function sendFile(ev){
        const reader = new FileReader();
        reader.readAsDataURL(ev.target.files[0]);
        reader.onload = () => {
            sendMessage(null,{
                name: ev.target.files[0].name,
                data: reader.result,
            });
        };
    }

    useEffect(() => {
        const div = divUnderMsgs.current;
        if(div){
            div.scrollIntoView({behavior:'smooth', block:'end'});
        }
    },[messages]);

    useEffect(() => {
        axios.get('/people').then(res => {
            const offlinePeopleArr = res.data
                .filter(p => p._id !== id)
                .filter(p => !Object.keys(onlinePeople).includes(p._id));
            
            const offlinePeople = {};
            offlinePeopleArr.forEach(p => {
                offlinePeople[p._id] = p;
            });

            setOfflinePeople(offlinePeople);
        });
    },[onlinePeople]);

    useEffect(() => {
        if(selectedUserId){
            axios.get('/messages/'+selectedUserId).then(res => {
                setMessages(res.data);
            });
        }
    });

    const onlinePeopleExclOurUser = {...onlinePeople};
    delete onlinePeopleExclOurUser[id];

    const messagesWithoutDupes = uniqBy(messages,'_id');

    return(
        <div className="flex h-screen">
            <div className="bg-blue-100 w-1/3 flex flex-col">
                <div className="flex-grow">
                    <Logo />
                    
                    {Object.keys(onlinePeopleExclOurUser).map(userId => (
                        <Contact 
                            key={userId}
                            id={userId}
                            online={true}
                            username={onlinePeopleExclOurUser[userId]}
                            onClick={() => {setSelectedUserId(userId)}}
                            selected={userId === selectedUserId} />
                    ))}
                    
                    {Object.keys(offlinePeople).map(userId => (
                        <Contact 
                            key={userId}
                            id={userId}
                            online={false}
                            username={offlinePeople[userId].username}
                            onClick={() => {setSelectedUserId(userId)}}
                            selected={userId === selectedUserId} />
                    ))}
                </div>
                
                <div className="p-2 text-center flex items-center justify-center">
                    <span className="mr-2 text-sm text-black-500 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                    </svg>
                        Logged In as {username}
                    </span>
                    <button onClick={logout} className="text-sm bg-blue-300 py-1 px-2 text-black-500 border rounded-sm">
                        Logout
                    </button>
                </div>

            </div>
            <div className="flex flex-col bg-blue-200 w-2/3 p-2">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-gray-500">
                                &larr; Select a Chat to start converstion
                            </div>
                        </div>
                    )}
                </div>

                {!!selectedUserId && (  
                    <div className="relative h-full">
                        <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                        {messagesWithoutDupes.map(message => (
                            <div key={message._id} className={(message.sender === id ? 'text-right' : 'text-left')}>
                                <div className={"text-left inline-block p-2 my-2 rounded-md text-sm " +(message.sender == id ? 'bg-blue-500 text-white' : 'bg-white text-gray-500')}>
                                    {message.text}
                                    {message.file && (
                                        <div className="">
                                            <a target="_blank" className="flex items-center gap-1 border-b" href={axios.defaults.baseURL + '/uploads/' + message.file}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                    <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
                                                </svg>
                                                {message.file}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={divUnderMsgs}></div>
                        </div>
                    </div>
                )}

                {!!selectedUserId && (
                <form className="flex gap-2" onSubmit={sendMessage}>
                    <input type="text"
                        value = {newMessageText}
                        onChange={ev => setNewMessageText(ev.target.value)} 
                        placeholder="Type your Message here"
                        className="bg-white-border flex-grow border p-2 rounded-sm" />

                        <label className="bg-blue-500 p-2 cursor-pointer text-white rounded-sm border border-blue-300">
                            <input type="file" className="hidden" onChange={sendFile}/>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
                            </svg>


                        </label>

                        <button type="submit" className="bg-blue-500 p-2 text-white rounded-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </button>
                </form>                    
                )}
            </div>
        </div>
    );
}