"use client";
import {Component,type ReactNode,type ErrorInfo} from "react";
/** Keep business workflows usable when graphics are unavailable or map setup fails. */
export default class MapFailureBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error,_info:ErrorInfo){
    console.warn("NAVIBORI map unavailable",{name:error.name});
  }
  render(){return this.state.failed?this.props.fallback:this.props.children;}
}
