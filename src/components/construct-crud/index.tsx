import { deleteConstruct, getConstruct, saveNewConstruct, updateConstruct } from "@/api/dbapi";
import { Construct } from "@/classes/Construct";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RiQuestionMark } from "react-icons/ri";
import './ConstructCrud.scss'
import StringArrayEditor from "../string-array-editor";
import { setConstructAsPrimary, addConstructToActive, constructIsActive, getActiveConstructList, removeConstructFromActive } from "@/api/constructapi";
import StringArrayEditorCards from "../string-array-editor-cards";
import { saveTavernCardAsImage } from "@/api/extrasapi";
import { Download, RefreshCw } from "lucide-react";
import { sendTxt2Img } from "@/api/sdapi";

const ConstructManagement = () => {
    const { id } = useParams<{ id: string }>();
    const [construct, setConstruct] = useState<Construct>(new Construct());
    const [constructState, setConstructState] = useState<Construct | null>(null);
    const [constructName, setConstructName] = useState<string>('');
    const [constructImage, setConstructImage] = useState<string>('');
    const [constructNickname, setConstructNick] = useState<string>('');
    const [constructCommands, setConstructCommands] = useState<string[]>([]);
    const [constructVisualDescription, setConstructVisualDescription] = useState<string>('');
    const [constructPersonality, setConstructPersonality] = useState<string>('');
    const [constructBackground, setConstructBackground] = useState<string>('');
    const [constructRelationships, setConstructRelationships] = useState<string[]>([]);
    const [constructInterests, setConstructInterests] = useState<string[]>([]);
    const [constructGreetings, setConstructGreetings] = useState<string[]>([]);
    const [constructFarewells, setConstructFarewells] = useState<string[]>([]);
    const [constructAuthorsNote, setConstructAuthorsNote] = useState<string>('');
    const [isActive, setIsActive] = useState<boolean>(false);
    const [isPrimary, setIsPrimary] = useState<boolean>(false);
    const [waitingForImage, setWaitingForImage] = useState<boolean>(false);

    const makeActive = async () => {
        if(constructState !== null) {
            await addConstructToActive(constructState._id);
        }
    }

    const makePrimary = async () => {
        if(constructState !== null) {
            await setConstructAsPrimary(constructState._id);
        }
    }

    const makeInactive = async () => {
        if(constructState !== null) {
            await removeConstructFromActive(constructState._id);
        }
    }

    const generateConstructImage = async () => {
        setWaitingForImage(true);
        if(constructVisualDescription !== '') {
            const imageData = await sendTxt2Img(constructVisualDescription);
            if(imageData !== null) {
                console.log(imageData);
                setConstructImage(`data:image/jpeg;base64,`+imageData.base64);
                saveConstruct();
            }
        }
        setWaitingForImage(false);
    }

    useEffect(() => {
        const getPassedCharacter = async () => {
            if(id !== undefined && id !== null && id !== 'create') {
                let character = await getConstruct(id)
                setConstructState(character);
                setConstructName(character.name);
                setConstructImage(character.avatar);
                setConstructNick(character.nickname);
                setConstructCommands(character.commands);
                setConstructVisualDescription(character.visualDescription);
                setConstructPersonality(character.personality);
                setConstructBackground(character.background);
                setConstructRelationships(character.relationships);
                setConstructInterests(character.interests);
                setConstructGreetings(character.greetings);
                setConstructFarewells(character.farewells);
                setConstructAuthorsNote(character.authorsNote);
                const getActiveStatus = async () => {
                    let status = await constructIsActive(character._id);
                    setIsActive(status);
                }
                const getPrimaryStatus = async () => {
                    let activeList = await getActiveConstructList();
                    if(activeList.length > 0){
                        if(activeList[0] === character._id){
                            setIsPrimary(true);
                        }
                    }
                }
                getPrimaryStatus();
                getActiveStatus();
            }
        }
        getPassedCharacter();
    }, [id !== undefined && id !== null && id !== 'create']);
    const returnToMenu = () => {
        history.back();
    }

    const saveConstruct = async () => {
        if(constructState !== null) {
            constructState.name = constructName;
            constructState.avatar = constructImage;
            constructState.nickname = constructNickname;
            constructState.commands = constructCommands;
            constructState.visualDescription = constructVisualDescription;
            constructState.personality = constructPersonality;
            constructState.background = constructBackground;
            constructState.relationships = constructRelationships;
            constructState.interests = constructInterests;
            constructState.greetings = constructGreetings;
            constructState.farewells = constructFarewells;
            constructState.authorsNote = constructAuthorsNote;
            await updateConstruct(constructState);
        } else {
            if(construct !== null) {
                const newConstruct = new Construct();
                newConstruct.name = constructName;
                newConstruct.avatar = constructImage;
                newConstruct.nickname = constructNickname;
                newConstruct.commands = constructCommands;
                newConstruct.visualDescription = constructVisualDescription;
                newConstruct.personality = constructPersonality;
                newConstruct.background = constructBackground;
                newConstruct.relationships = constructRelationships;
                newConstruct.interests = constructInterests;
                newConstruct.greetings = constructGreetings;
                newConstruct.farewells = constructFarewells;
                newConstruct.authorsNote = constructAuthorsNote;
                await saveNewConstruct(newConstruct);
                returnToMenu();
            }
        }
    }

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setConstructImage(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const deleteConstructAndReturn = async () => {
        if(constructState !== null) {
            await deleteConstruct(constructState._id);
            returnToMenu();
        }else {
            setConstructNick('');
            setConstructName('');
            setConstructImage('');
            setConstructCommands([]);
            setConstructVisualDescription('');
            setConstructPersonality('');
            setConstructBackground('');
            setConstructRelationships([]);
            setConstructInterests([]);
            setConstructGreetings([]);
            setConstructFarewells([]);
            setConstructAuthorsNote('');
        }
    }

    const handleConstructExport = async () => {
        if(constructState === null) return;
        const url = await saveTavernCardAsImage(constructState);
        const element = document.createElement("a");
        element.href = url;
        element.download = `${constructState.name}.ConstructOS.png`;
        document.body.appendChild(element);
        element.click();
    }

    return (
        <div className="w-full h-[calc(100vh-70px)] grid grid-rows-[auto,1fr] themed-root gap-2">
            <h2 className="text-2xl font-bold text-theme-text text-shadow-xl">Construct Editor</h2>
            <div className="grid grid-cols-5 grid-rows-[calc, 1fr] gap-2 text-left">
                <div className="col-span-1 items-center gap-2 h-full">
                    <div className="w-full flex flex-col h-full items-center justify-center gap-2">
                        <div className="flex flex-col h-1/6 w-full">
                            <label htmlFor="construct-role" className="font-semibold">Name</label>
                            <input
                                type="text"
                                required={true}
                                id="construct-name"
                                className="themed-input w-full h-1/2"
                                value={constructName}
                                onChange={(event) => setConstructName(event.target.value)}
                            />
                        </div>
                        <div className="flex flex-col h-3/6 w-full items-center justify-center">
                        <label htmlFor="image-upload" className="relative">
                            <div className={"absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center" + (!waitingForImage ? " hidden" : "")}>
                                <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-theme-text"></div>
                            </div>
                            {constructImage === '' ? <RiQuestionMark className="construct-image-default"/> : <img src={constructImage} alt={constructName} className="construct-image"/>}
                        </label>
                            <input 
                                type="file" 
                                required={true}
                                id="image-upload" 
                                className="hidden" 
                                accept=".png, .jpg, .jpeg"
                                onChange={handleImageUpload}
                            />
                        </div>
                        <button className="themed-button-pos" onClick={() => generateConstructImage()} title="Generate Image using Visual Description"><RefreshCw/></button>
                        <div className="flex flex-col flex-grow-0 h-1/6 w-full">
                            <label htmlFor="construct-role" className="font-semibold">Nickname</label>
                            <input
                                type="text"
                                required={false}
                                id="construct-role"
                                className="themed-input w-full h-1/2"
                                value={constructNickname}
                                onChange={(event) => setConstructNick(event.target.value)}
                            />
                        </div>
                        <div className="flex flex-col flex-grow-0 h-2/6 w-full">
                            <label htmlFor="construct-note" className="font-semibold">Author's Note</label>
                            <textarea
                                required={false}
                                id="construct-note"
                                className="themed-input w-full h-full"
                                value={constructAuthorsNote}
                                onChange={(event) => setConstructAuthorsNote(event.target.value)}
                            />
                        </div>
                        <div className="text-left w-full">
                            <b>Construct Status:</b> {isActive ? <span className="text-theme-flavor-text font-bold">Active</span> : <span className="text-theme-hover-neg font-bold">Inactive</span>}{isActive && <span className="text-theme-flavor-text font-bold"> + {isPrimary ? 'Primary': 'Secondary'}</span>}
                        </div>
                    </div>
                </div>
                <div className="col-span-2 gap-2 grid grid-rows-2">
                    <div className="row-span-1 flex flex-col gap-2 flex-grow-0">
                    <div className="flex flex-col h-1/2 flex-grow-0">
                            <label htmlFor="construct-background" className="font-semibold">Background</label>
                            <textarea
                                id="construct-background"
                                className="themed-input h-full"
                                value={constructBackground}
                                onChange={(event) => setConstructBackground(event.target.value)}
                            />
                        </div>
                        <div className="flex flex-col h-1/2 flex-grow-0">
                            <label htmlFor="construct-personality" className="font-semibold">Personality</label>
                            <textarea
                                id="construct-personality h-1/2"
                                className="themed-input h-full"
                                value={constructPersonality}
                                onChange={(event) => setConstructPersonality(event.target.value)}
                            />
                        </div>
                    </div>
                    <div className="row-span-1 flex flex-col gap-2 flex-grow-0">
                        <div className="flex flex-col h-1/2 flex-grow-0">
                            <label htmlFor="construct-appearance" className="font-semibold">Visual Description</label>
                            <textarea
                                id="construct-appearance"
                                className="themed-input h-full"
                                value={constructVisualDescription}
                                onChange={(event) => setConstructVisualDescription(event.target.value)}
                            />
                        </div>
                        <div className="flex flex-col h-1/2 overflow-y-auto flex-grow-0">
                            <label htmlFor="construct-relationships" className="font-semibold">Relationships</label>
                            <StringArrayEditorCards 
                                value={constructRelationships}
                                onChange={(event) => setConstructRelationships(event)}
                            />
                        </div>
                    </div>
                </div>
                <div className="col-span-2 gap-2 grid grid-rows-2">
                    <div className="row-span-1 flex flex-col gap-2 flex-grow-0">
                        <div className="flex flex-col h-1/2 overflow-y-auto flex-grow-0">
                            <label htmlFor="construct-interests" className="font-semibold">Interests</label>
                            <StringArrayEditorCards
                                value={constructInterests}
                                onChange={(event) => setConstructInterests(event)}
                            />
                        </div>
                        <div className="flex flex-col h-1/2 overflow-y-auto flex-grow-0">
                            <label htmlFor="construct-greetings" className="font-semibold">Greetings</label>
                            <StringArrayEditorCards
                                value={constructGreetings}
                                onChange={(event) => setConstructGreetings(event)}
                            />
                        </div>
                    </div>
                    <div className="row-span-1 flex flex-col gap-4 flex-grow-0">
                        <div className="flex flex-col h-1/2 overflow-y-auto flex-grow-0">
                            <label htmlFor="construct-farewells" className="font-semibold">Farewells</label>
                            <StringArrayEditorCards
                                value={constructFarewells}
                                onChange={(event) => setConstructFarewells(event)}
                            />
                        </div>
                        <div className="flex flex-col h-1/2 flex-grow-0">
                            <label htmlFor="construct-questions" className="font-semibold">User Actions</label>
                            <div className="grid grid-rows-2 h-full gap-1">
                                <div className="row-span-1 flex flex-row gap-1">
                                    <button className="themed-button-pos w-1/4" onClick={() => makePrimary()}>Set as Primary Construct</button>
                                    <button className="themed-button-pos w-1/4" onClick={() => makeActive()}>Add as Secondary Construct</button>
                                    <button className="themed-button-neg w-1/4" onClick={() => makeInactive()}>Remove Active Construct</button>
                                    <button className="themed-button-neg w-1/4" onClick={() => deleteConstructAndReturn()}>{constructState ? 'Delete Construct' : 'Clear Values'}</button>
                                </div>
                                <div className="row-span-1 flex flex-row gap-1">
                                    <button type="submit" className="themed-button-neg w-1/3" onClick={returnToMenu} title="Return to Menu">Return to Menu</button>
                                    <button className="themed-button-pos w-1/3" onClick={() => saveConstruct()} title="Save">Save</button>
                                    <button className="themed-button-pos w-1/3 flex flex-col items-center justify-center" onClick={() => handleConstructExport()} title="Export as V2 Card"><Download size={36}/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConstructManagement;