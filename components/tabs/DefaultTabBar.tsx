import React from 'react';
import { Animated, Dimensions, LayoutChangeEvent, Platform, ScrollView, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { TabBarPropsType, TabData } from './PropsType';
import defaultStyles from './Styles';

const WINDOW_WIDTH = Dimensions.get('window').width;

export interface PropsType extends TabBarPropsType {
  scrollValue?: any;
  styles?: typeof defaultStyles;
  tabStyle?: ViewStyle;
  tabsContainerStyle?: ViewStyle;
  /** default: false */
  dynamicTabUnderlineWidth?: boolean;
  keyboardShouldPersistTaps?: boolean;
}

export interface StateType {
  _leftTabUnderline: Animated.Value;
  _widthTabUnderline: Animated.Value;
  _containerWidth: number;
  _tabContainerWidth: number;
}
export class DefaultTabBar extends React.PureComponent<PropsType, StateType> {
  static defaultProps = {
    animated: true,
    tabs: [],
    goToTab: () => {},
    activeTab: 0,
    page: 5,
    tabBarUnderlineStyle: {},
    tabBarBackgroundColor: '#fff',
    tabBarActiveTextColor: '',
    tabBarInactiveTextColor: '',
    tabBarTextStyle: {},
    dynamicTabUnderlineWidth: false,
    styles: defaultStyles,
  };

  _tabsMeasurements: any[] = [];
  _tabContainerMeasurements: any;
  _containerMeasurements: any;
  _scrollView: ScrollView;

  constructor(props: PropsType) {
    super(props);
    this.state = {
      _leftTabUnderline: new Animated.Value(0),
      _widthTabUnderline: new Animated.Value(0),
      _containerWidth: WINDOW_WIDTH,
      _tabContainerWidth: WINDOW_WIDTH,
    };
  }

  componentDidMount() {
    this.props.scrollValue.addListener(this.updateView);
  }

  updateView = (offset: any) => {
    const position = Math.floor(offset.value);
    const pageOffset = offset.value % 1;
    const tabCount = this.props.tabs.length;
    const lastTabPosition = tabCount - 1;

    if (tabCount === 0 || offset.value < 0 || offset.value > lastTabPosition) {
      return;
    }

    if (
      this.necessarilyMeasurementsCompleted(
        position,
        position === lastTabPosition,
      )
    ) {
      this.updateTabPanel(position, pageOffset);
      this.updateTabUnderline(position, pageOffset, tabCount);
    }
  };

  necessarilyMeasurementsCompleted(position: number, isLastTab: boolean) {
    return (
      this._tabsMeasurements[position] &&
      (isLastTab || this._tabsMeasurements[position + 1]) &&
      this._tabContainerMeasurements &&
      this._containerMeasurements
    );
  }

  updateTabPanel(position: number, pageOffset: number) {
    const containerWidth = this._containerMeasurements.width;
    const tabWidth = this._tabsMeasurements[position].width;
    const nextTabMeasurements = this._tabsMeasurements[position + 1];
    const nextTabWidth =
      (nextTabMeasurements && nextTabMeasurements.width) || 0;
    const tabOffset = this._tabsMeasurements[position].left;
    const absolutePageOffset = pageOffset * tabWidth;
    let newScrollX = tabOffset + absolutePageOffset;

    newScrollX -=
      (containerWidth -
        (1 - pageOffset) * tabWidth -
        pageOffset * nextTabWidth) /
      2;
    newScrollX = newScrollX >= 0 ? newScrollX : 0;

    if (Platform.OS === 'android') {
      this._scrollView.scrollTo({ x: newScrollX, y: 0, animated: false });
    } else {
      const rightBoundScroll =
        this._tabContainerMeasurements.width -
        this._containerMeasurements.width;
      newScrollX =
        newScrollX > rightBoundScroll ? rightBoundScroll : newScrollX;
      this._scrollView.scrollTo({ x: newScrollX, y: 0, animated: false });
    }
  }

  updateTabUnderline(position: number, pageOffset: number, tabCount: number) {
    const { dynamicTabUnderlineWidth } = this.props;

    if (0 <= position && position <= tabCount - 1) {
      if (dynamicTabUnderlineWidth) {
        const nowLeft = this._tabsMeasurements[position].left;
        const nowRight = this._tabsMeasurements[position].right;
        const nextTabLeft = this._tabsMeasurements[position + 1].left;
        const nextTabRight = this._tabsMeasurements[position + 1].right;

        const newLineLeft =
          pageOffset * nextTabLeft + (1 - pageOffset) * nowLeft;
        const newLineRight =
          pageOffset * nextTabRight + (1 - pageOffset) * nowRight;

        this.state._leftTabUnderline.setValue(newLineLeft);
        this.state._widthTabUnderline.setValue(newLineRight - newLineLeft);
      } else {
        const nowLeft = (position * this.state._tabContainerWidth) / tabCount;
        const nextTabLeft =
          ((position + 1) * this.state._tabContainerWidth) / tabCount;
        const newLineLeft =
          pageOffset * nextTabLeft + (1 - pageOffset) * nowLeft;
        this.state._leftTabUnderline.setValue(newLineLeft);
      }
    }
  }

  onPress = (index: number) => {
    const { goToTab, onTabClick, tabs } = this.props;
    // tslint:disable-next-line:no-unused-expression
    onTabClick && onTabClick(tabs[index], index);
    // tslint:disable-next-line:no-unused-expression
    goToTab && goToTab(index);
  };

  renderTab(tab: TabData, index: number, width: number, onLayoutHandler: any) {
    const {
      tabBarActiveTextColor: activeTextColor,
      tabBarInactiveTextColor: inactiveTextColor,
      tabBarTextStyle: textStyle,
      activeTab,
      renderTab,
      styles = defaultStyles,
    } = this.props;
    const isTabActive = activeTab === index;
    const textColor = isTabActive
      ? activeTextColor || styles.TabBar.activeTextColor
      : inactiveTextColor || styles.TabBar.inactiveTextColor;

    return (
      <TouchableOpacity
        activeOpacity={1}
        key={`${tab.title}_${index}`}
        accessible
        accessibilityTraits="button"
        onPress={() => this.onPress(index)}
        onLayout={onLayoutHandler}
      >
        <View
          style={{
            ...styles.TabBar.tab,
            ...this.props.tabStyle,
            width,
          }}
        >
          {renderTab ? (
            renderTab(tab)
          ) : (
            <Text
              style={{
                color: textColor,
                ...styles.TabBar.textStyle,
                ...textStyle,
              }}
            >
              {tab.title}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  measureTab = (page: number, event: any) => {
    const { x, width, height } = event.nativeEvent.layout;
    this._tabsMeasurements[page] = { left: x, right: x + width, width, height };
    this.updateView({ value: this.props.scrollValue._value });
  };

  render() {
    const {
      tabs,
      page = 0,
      tabBarUnderlineStyle,
      tabBarBackgroundColor,
      styles = defaultStyles,
      tabsContainerStyle,
      renderUnderline,
      keyboardShouldPersistTaps,
    } = this.props;

    const tabUnderlineStyle = {
      position: 'absolute',
      bottom: 0,
      ...styles.TabBar.underline,
      ...tabBarUnderlineStyle,
    };

    const dynamicTabUnderline = {
      left: this.state._leftTabUnderline,
      width: this.state._widthTabUnderline,
    };

    const tabWidth = this.state._containerWidth / Math.min(page, tabs.length);
    const underlineProps = {
      style: {
        ...tabUnderlineStyle,
        ...dynamicTabUnderline,
      },
    };

    return (
      <View
        style={{
          ...styles.TabBar.container,
          backgroundColor: tabBarBackgroundColor,
        }}
        onLayout={this.onContainerLayout}
      >
        <ScrollView
          ref={(scrollView: any) => {
            this._scrollView = scrollView;
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          directionalLockEnabled
          bounces={false}
          scrollsToTop={false}
          scrollEnabled={tabs.length > page}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          renderToHardwareTextureAndroid
        >
          <View
            style={{
              ...styles.TabBar.tabs,
              ...tabsContainerStyle,
              backgroundColor: tabBarBackgroundColor,
            }}
            onLayout={this.onTabContainerLayout}
          >
            {tabs.map((name, index) => {
              let tab = { title: name } as TabData;
              if (tabs.length - 1 >= index) {
                tab = tabs[index];
              }
              return this.renderTab(
                tab,
                index,
                tabWidth,
                this.measureTab.bind(this, index),
              );
            })}
            {renderUnderline ? (
              renderUnderline(underlineProps)
            ) : (
              <Animated.View {...underlineProps} />
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  onTabContainerLayout = (e: LayoutChangeEvent) => {
    this._tabContainerMeasurements = e.nativeEvent.layout;
    let width = this._tabContainerMeasurements.width;
    if (width < WINDOW_WIDTH) {
      width = WINDOW_WIDTH;
    }
    this.setState({ _tabContainerWidth: width });
    if (!this.props.dynamicTabUnderlineWidth) {
      this.state._widthTabUnderline.setValue(width / this.props.tabs.length);
    }
    this.updateView({ value: this.props.scrollValue._value });
  };

  onContainerLayout = (e: LayoutChangeEvent) => {
    this._containerMeasurements = e.nativeEvent.layout;
    this.setState({ _containerWidth: this._containerMeasurements.width });
    this.updateView({ value: this.props.scrollValue._value });
  };
}
