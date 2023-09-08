import { getStorageValue, setStorageValue } from "@/api/dbapi";
import { getSDAPIUrl, setSDAPIUrl } from "@/api/sdapi";
import Accordian from "@/components/accordian";
import LLMPanel from "@/components/llm-panel";
import { defaultThemes } from "@/constants";
import { useEffect, useState } from "react";

const SettingsPage = () => {
    const [currentTheme, setCurrentTheme] = useState("");
    const [sdURL, setSDURL] = useState("");

    const setTheme = async (themeID: string) => {
        await setStorageValue("uiTheme", themeID);
        window.location.reload();
    };

    const setSDAPI = async (url: string) => {
        setSDAPIUrl(url);
    };

    useEffect(() => {
        const getTheme = async () => {
            const theme = await getStorageValue("uiTheme");
            setCurrentTheme(theme);
        };
        const getURL = async () => {
            const url = await getSDAPIUrl();
            setSDURL(url);
        }
        getTheme();
        getURL();
    }, []);

    return (
        <div className="w-full h-[calc(100vh-70px)] flex flex-col gap-4 themed-root overflow-y-auto overflow-x-hidden">
            <h2 className="text-2xl font-bold text-theme-text text-shadow-xl">Settings</h2>
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1 flex flex-col gap-4">
                        <Accordian title="LLM">
                            <LLMPanel />
                        </Accordian>
                        <Accordian title="Stable Diffusion API">
                            <div className="flex flex-col text-left gap-1">
                                <label htmlFor="sdapi-url" className="text-theme-text font-semibold">URL</label>
                                <i>Note: Enable the API flag inside of Automatic1111 and enter your URL here.</i>
                                <input type="text" id="sdapi-url" value={sdURL} className="themed-input" onChange={(e) => setSDURL(e.target.value)}/>
                                <button className="themed-button-pos" onClick={() => setSDAPI(sdURL)}>Save</button>
                            </div>
                        </Accordian>
                    </div>
                    <div className="col-span-1">
                        <Accordian title="Theme">
                        <div className="flex flex-col">
                            <div className="grid grid-cols-2 gap-2">
                                {Array.isArray(defaultThemes) && defaultThemes.map((theme, index) => {
                                    return (
                                        <button key={index} onClick={() => setTheme(theme._id)} className="themed-button-pos">
                                            {theme.name}
                                            {currentTheme === theme._id && <span className="text-theme-text"> (Current)</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        </Accordian>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;